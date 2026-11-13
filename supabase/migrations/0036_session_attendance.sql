-- 0036: session attendance (S5). Coach records present/absent + free score + performance 1-5 + note per member.
-- Who/when are stamped by the DB; later edits are audited (before/after); no deletes.

create table if not exists public.session_attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.training_sessions(id),
  athlete_id  uuid not null references public.profiles(id),
  status      text not null check (status in ('present', 'absent')),
  score       numeric(8,2) check (score is null or score >= 0),
  performance smallint check (performance is null or performance between 1 and 5),
  note        text check (note is null or length(note) <= 300),
  recorded_by uuid not null references public.profiles(id),
  recorded_at timestamptz not null default now(),
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz,
  constraint session_attendance_session_athlete_key unique (session_id, athlete_id)
);

create index if not exists session_attendance_athlete_idx on public.session_attendance (athlete_id);

create or replace function public.session_group(s uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select group_id from public.training_sessions where id = s;
$$;

-- ---- guard: validation + bookkeeping (DB owns recorded_by/at, updated_by/at) ----
create or replace function public.session_attendance_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin boolean := public.is_admin();
  s record;
begin
  if tg_op = 'UPDATE' then
    if not admin and (new.id is distinct from old.id
                      or new.session_id is distinct from old.session_id
                      or new.athlete_id is distinct from old.athlete_id
                      or new.recorded_by is distinct from old.recorded_by
                      or new.recorded_at is distinct from old.recorded_at) then
      raise exception 'errInvalid' using errcode = '22023';
    end if;
    -- Nothing meaningful changed (e.g. re-saving the whole sheet): keep the row exactly as it was.
    if new.session_id = old.session_id and new.athlete_id = old.athlete_id
       and new.status is not distinct from old.status
       and new.score is not distinct from old.score
       and new.performance is not distinct from old.performance
       and new.note is not distinct from old.note then
      return old;
    end if;
  end if;

  select scheduled_at, status, group_id into s from public.training_sessions where id = new.session_id;
  if not found then
    raise exception 'attendance_not_allowed' using errcode = '22023';
  end if;

  -- Coach edit window: 7 days after the session (same as cancelling). Admins are exempt.
  if not admin and now() > s.scheduled_at + interval '7 days' then
    raise exception 'errTooLate' using errcode = '22023';
  end if;

  if s.status <> 'scheduled' or s.scheduled_at > now() + interval '1 hour'
     or not exists (select 1 from public.training_group_members m
                     where m.group_id = s.group_id and m.athlete_id = new.athlete_id
                       and m.joined_at <= s.scheduled_at
                       and (m.left_at is null or m.left_at > s.scheduled_at)) then
    raise exception 'attendance_not_allowed' using errcode = '22023';
  end if;

  new.note := nullif(trim(new.note), '');
  if tg_op = 'INSERT' then
    new.recorded_by := coalesce(auth.uid(), new.recorded_by);
    new.recorded_at := now();
    new.updated_by := null;
    new.updated_at := null;
  else
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_session_attendance_guard on public.session_attendance;
create trigger trg_session_attendance_guard before insert or update on public.session_attendance
  for each row execute function public.session_attendance_guard();

-- ---- audit ----
create or replace function public.audit_session_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'attendance.create', 'session_attendance', new.id, null,
            jsonb_build_object('session_id', new.session_id, 'athlete_id', new.athlete_id, 'status', new.status,
                               'score', new.score, 'performance', new.performance, 'note', new.note));
  else
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'attendance.update', 'session_attendance', new.id,
            jsonb_build_object('status', old.status, 'score', old.score, 'performance', old.performance, 'note', old.note),
            jsonb_build_object('status', new.status, 'score', new.score, 'performance', new.performance, 'note', new.note));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_session_attendance_audit_ins on public.session_attendance;
create trigger trg_session_attendance_audit_ins after insert on public.session_attendance
  for each row execute function public.audit_session_attendance();

drop trigger if exists trg_session_attendance_audit_upd on public.session_attendance;
create trigger trg_session_attendance_audit_upd after update on public.session_attendance
  for each row when (old.status is distinct from new.status or old.score is distinct from new.score
                     or old.performance is distinct from new.performance or old.note is distinct from new.note)
  execute function public.audit_session_attendance();

-- ---- RLS ----
alter table public.session_attendance enable row level security;

drop policy if exists "sa_select" on public.session_attendance;
create policy "sa_select" on public.session_attendance for select
  using (athlete_id = auth.uid() or public.group_coach(public.session_group(session_id)) = auth.uid() or public.is_admin());

drop policy if exists "sa_insert" on public.session_attendance;
create policy "sa_insert" on public.session_attendance for insert
  with check (public.is_coach(auth.uid()) and public.group_coach(public.session_group(session_id)) = auth.uid()
              and recorded_by = auth.uid());

drop policy if exists "sa_update" on public.session_attendance;
create policy "sa_update" on public.session_attendance for update
  using (public.is_coach(auth.uid()) and public.group_coach(public.session_group(session_id)) = auth.uid())
  with check (public.is_coach(auth.uid()) and public.group_coach(public.session_group(session_id)) = auth.uid());

drop policy if exists "sa_admin_all" on public.session_attendance;
create policy "sa_admin_all" on public.session_attendance for all
  using (public.is_admin()) with check (public.is_admin());

-- No delete policy for coaches/athletes.

-- ---- re-define 0035 functions with STATIC references to session_attendance (same rules as 0035) ----
create or replace function public.training_session_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin boolean := public.is_admin();
  has_present boolean := false;
begin
  if not admin and (new.id is distinct from old.id
                    or new.group_id is distinct from old.group_id
                    or new.scheduled_at is distinct from old.scheduled_at
                    or new.created_at is distinct from old.created_at) then
    raise exception 'errInvalid' using errcode = '22023';
  end if;

  -- Coach edit window: 7 days after the session; past sessions cannot be marked as a holiday. Admins are exempt.
  if not admin and new.status is distinct from old.status then
    if now() > old.scheduled_at + interval '7 days' then
      raise exception 'errTooLate' using errcode = '22023';
    end if;
    if new.status = 'cancelled' and old.scheduled_at <= now() and new.cancel_kind = 'holiday' then
      raise exception 'errKindPast' using errcode = '22023';
    end if;
  end if;

  if new.status = 'cancelled' and old.status = 'scheduled' then
    new.cancel_reason := trim(new.cancel_reason);
    if new.cancel_kind is null or new.cancel_reason is null
       or length(new.cancel_reason) not between 3 and 200 then
      raise exception 'errReason' using errcode = '22023';
    end if;
    select exists (select 1 from public.session_attendance where session_id = old.id and status = 'present')
      into has_present;
    if has_present then
      raise exception 'errHasAttendance' using errcode = '22023';
    end if;
    new.cancelled_by := auth.uid();
    new.cancelled_at := now();
  elsif new.status = 'scheduled' and old.status = 'cancelled' then
    new.cancel_kind := null;
    new.cancel_reason := null;
    new.cancelled_by := null;
    new.cancelled_at := null;
  elsif new.cancel_kind is distinct from old.cancel_kind
     or new.cancel_reason is distinct from old.cancel_reason
     or new.cancelled_by is distinct from old.cancelled_by
     or new.cancelled_at is distinct from old.cancelled_at then
    -- status unchanged: the cancellation record is immutable
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function public.ensure_group_sessions(p_group uuid, p_weeks int default 12)
returns int language plpgsql security definer set search_path = public as $$
declare
  g public.training_groups%rowtype;
  today_cairo date := (now() at time zone 'Africa/Cairo')::date;
  d_from date;
  d_to date;
  n int := 0;
begin
  if not (auth.uid() is null
          or (public.is_coach(auth.uid()) and public.group_coach(p_group) = auth.uid())
          or public.is_admin()) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  if p_weeks is null or p_weeks < 1 or p_weeks > 52 then
    raise exception 'errInvalid' using errcode = '22023';
  end if;

  select * into g from public.training_groups where id = p_group;
  if not found or not g.is_active then
    return 0;
  end if;

  -- Remove only future, still-scheduled, attendance-free sessions that no longer match the schedule.
  delete from public.training_sessions s
   where s.group_id = p_group
     and s.status = 'scheduled'
     and s.scheduled_at > now()
     and (
       not ((extract(dow from s.scheduled_at at time zone 'Africa/Cairo'))::smallint = any (g.weekdays))
       or (s.scheduled_at at time zone 'Africa/Cairo')::time <> g.start_time
       or (s.scheduled_at at time zone 'Africa/Cairo')::date < g.starts_on
     )
     and not exists (select 1 from public.audit_logs l
                      where l.entity_type = 'training_sessions' and l.entity_id = s.id)
     and not exists (select 1 from public.session_attendance a where a.session_id = s.id);

  d_from := greatest(g.starts_on, today_cairo);
  d_to := today_cairo + 7 * p_weeks;
  if d_from > d_to then
    return 0;
  end if;

  insert into public.training_sessions (group_id, scheduled_at)
  select p_group, ((d::date + g.start_time) at time zone 'Africa/Cairo')
    from generate_series(d_from::timestamp, d_to::timestamp, interval '1 day') as d
   where (extract(dow from d))::smallint = any (g.weekdays)
     and ((d::date + g.start_time) at time zone 'Africa/Cairo') > now()
  on conflict (group_id, scheduled_at) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.ensure_group_sessions(uuid, int) from public, anon;
grant execute on function public.ensure_group_sessions(uuid, int) to authenticated;
revoke execute on function public.session_group(uuid) from public, anon;
grant execute on function public.session_group(uuid) to authenticated;
revoke execute on function public.training_session_guard(), public.audit_session_attendance(), public.session_attendance_guard()
  from public, anon, authenticated;
