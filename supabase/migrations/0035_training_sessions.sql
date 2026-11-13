-- 0035: training sessions (S4). Generated from the group's schedule (Africa/Cairo wall time), cancellable in advance.
-- Cancelled sessions are kept (who/when/why + audit); coaches never insert or delete sessions directly.

create table if not exists public.training_sessions (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.training_groups(id),
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  cancel_kind   text check (cancel_kind in ('holiday', 'coach_absent', 'other')),
  cancel_reason text,
  cancelled_by  uuid references public.profiles(id),
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint training_sessions_group_time_key unique (group_id, scheduled_at),
  constraint training_sessions_cancel_check check (
    (status = 'scheduled' and cancel_kind is null and cancel_reason is null
       and cancelled_by is null and cancelled_at is null)
    or (status = 'cancelled' and cancel_kind is not null
       and cancel_reason is not null and length(trim(cancel_reason)) between 3 and 200)
  )
);

create index if not exists training_sessions_group_time_idx on public.training_sessions (group_id, scheduled_at);

-- ---- guard: DB owns the bookkeeping; coaches cannot move/re-assign sessions ----
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
    if to_regclass('public.session_attendance') is not null then
      execute 'select exists (select 1 from public.session_attendance where session_id = $1 and status = ''present'')'
        into has_present using old.id;
      if has_present then
        raise exception 'errHasAttendance' using errcode = '22023';
      end if;
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

drop trigger if exists trg_training_sessions_guard on public.training_sessions;
create trigger trg_training_sessions_guard before update on public.training_sessions
  for each row execute function public.training_session_guard();

-- ---- audit ----
create or replace function public.audit_training_session()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(),
          case when new.status is not distinct from old.status then 'training_session.reschedule'
               when new.status = 'cancelled' then 'training_session.cancel'
               else 'training_session.restore' end,
          'training_sessions', new.id,
          jsonb_build_object('group_id', old.group_id, 'scheduled_at', old.scheduled_at, 'status', old.status,
                             'cancel_kind', old.cancel_kind, 'cancel_reason', old.cancel_reason),
          jsonb_build_object('group_id', new.group_id, 'scheduled_at', new.scheduled_at, 'status', new.status,
                             'cancel_kind', new.cancel_kind, 'cancel_reason', new.cancel_reason));
  return new;
end;
$$;

drop trigger if exists trg_training_sessions_audit on public.training_sessions;
create trigger trg_training_sessions_audit after update of status, scheduled_at on public.training_sessions
  for each row when (old.status is distinct from new.status or old.scheduled_at is distinct from new.scheduled_at)
  execute function public.audit_training_session();

-- ---- RLS ----
alter table public.training_sessions enable row level security;

drop policy if exists "ts_select" on public.training_sessions;
create policy "ts_select" on public.training_sessions for select
  using (public.group_coach(group_id) = auth.uid() or public.is_group_member(group_id) or public.is_admin());

drop policy if exists "ts_update" on public.training_sessions;
create policy "ts_update" on public.training_sessions for update
  using (public.is_coach(auth.uid()) and public.group_coach(group_id) = auth.uid())
  with check (public.is_coach(auth.uid()) and public.group_coach(group_id) = auth.uid());

drop policy if exists "ts_admin_all" on public.training_sessions;
create policy "ts_admin_all" on public.training_sessions for all
  using (public.is_admin()) with check (public.is_admin());

-- No insert/delete policy for coaches: generation goes through ensure_group_sessions().

-- ---- generation ----
create or replace function public.ensure_group_sessions(p_group uuid, p_weeks int default 12)
returns int language plpgsql security definer set search_path = public as $$
declare
  g public.training_groups%rowtype;
  today_cairo date := (now() at time zone 'Africa/Cairo')::date;
  d_from date;
  d_to date;
  n int := 0;
  has_att boolean := to_regclass('public.session_attendance') is not null;
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
  -- Dynamic SQL: session_attendance may not exist yet (S5), so it must not be planned statically.
  execute format($q$
    delete from public.training_sessions s
     where s.group_id = $1
       and s.status = 'scheduled'
       and s.scheduled_at > now()
       and (
         not ((extract(dow from s.scheduled_at at time zone 'Africa/Cairo'))::smallint = any ($2))
         or (s.scheduled_at at time zone 'Africa/Cairo')::time <> $3
         or (s.scheduled_at at time zone 'Africa/Cairo')::date < $4
       )
       and not exists (select 1 from public.audit_logs l
                        where l.entity_type = 'training_sessions' and l.entity_id = s.id)
       %s
  $q$, case when has_att
            then 'and not exists (select 1 from public.session_attendance a where a.session_id = s.id)'
            else '' end)
    using p_group, g.weekdays, g.start_time, g.starts_on;

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
revoke execute on function public.training_session_guard(), public.audit_training_session()
  from public, anon, authenticated;
