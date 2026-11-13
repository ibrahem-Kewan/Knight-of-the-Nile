-- 0038: attendance claims (S8). An athlete recorded absent / not recorded alerts the coach within 7 days;
-- the coach accepts (attendance becomes 'present') or rejects with a reason. Nothing is deleted or silently edited.

create table if not exists public.attendance_claims (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.training_sessions(id),
  athlete_id      uuid not null references public.profiles(id),
  message         text check (message is null or length(message) <= 300),
  status          text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  created_at      timestamptz not null default now(),
  resolved_by     uuid references public.profiles(id),
  resolved_at     timestamptz,
  resolution_note text check (resolution_note is null or length(resolution_note) <= 300)
);

create unique index if not exists attendance_claims_one_open
  on public.attendance_claims (session_id, athlete_id) where status = 'open';
create index if not exists attendance_claims_session_idx on public.attendance_claims (session_id);
create index if not exists attendance_claims_athlete_idx on public.attendance_claims (athlete_id);

-- ---- guard: validation on insert; updates only through resolve_attendance_claim() (or admin) ----
create or replace function public.attendance_claim_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin boolean := public.is_admin();
  internal boolean := coalesce(current_setting('kn.claim_resolve', true), '') = '1';
  s record;
begin
  if tg_op = 'UPDATE' then
    if not (admin or internal) then
      raise exception 'errForbidden' using errcode = '42501';
    end if;
    return new;
  end if;

  -- INSERT
  if admin then
    return new;
  end if;

  select scheduled_at, status, group_id into s from public.training_sessions where id = new.session_id;
  if not found
     or s.status <> 'scheduled'
     or s.scheduled_at > now()
     or s.scheduled_at < now() - interval '7 days'
     or not exists (select 1 from public.training_group_members m
                     where m.group_id = s.group_id and m.athlete_id = new.athlete_id
                       and m.joined_at <= s.scheduled_at
                       and (m.left_at is null or m.left_at > s.scheduled_at))
     or exists (select 1 from public.session_attendance a
                 where a.session_id = new.session_id and a.athlete_id = new.athlete_id and a.status = 'present')
     -- at most one rejected claim per session/athlete: no re-claim spam
     or exists (select 1 from public.attendance_claims r
                 where r.session_id = new.session_id and r.athlete_id = new.athlete_id and r.status = 'rejected')
  then
    raise exception 'claim_not_allowed' using errcode = '22023';
  end if;

  new.message := nullif(trim(new.message), '');
  new.status := 'open';
  new.created_at := now();
  new.resolved_by := null;
  new.resolved_at := null;
  new.resolution_note := null;
  return new;
end;
$$;

drop trigger if exists trg_attendance_claim_guard on public.attendance_claims;
create trigger trg_attendance_claim_guard before insert or update on public.attendance_claims
  for each row execute function public.attendance_claim_guard();

-- ---- RLS ----
alter table public.attendance_claims enable row level security;

drop policy if exists "acl_select" on public.attendance_claims;
create policy "acl_select" on public.attendance_claims for select
  using (athlete_id = auth.uid()
         or public.group_coach(public.session_group(session_id)) = auth.uid()
         or public.is_admin());

drop policy if exists "acl_insert" on public.attendance_claims;
create policy "acl_insert" on public.attendance_claims for insert
  with check (athlete_id = auth.uid() and status = 'open' and resolved_by is null);

drop policy if exists "acl_admin_all" on public.attendance_claims;
create policy "acl_admin_all" on public.attendance_claims for all
  using (public.is_admin()) with check (public.is_admin());

-- No update/delete policy for athletes or coaches: the coach resolves through the function below.

-- ---- 0036 guard re-defined: same body, 7-day window skipped only for a claim accept ----
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
  -- (the claim-accept flag, set only inside resolve_attendance_claim, lifts the window for that one row:
  --  the coach's deadline is claim.created_at + 7 days, checked there)
  if not admin and now() > s.scheduled_at + interval '7 days'
     and coalesce(current_setting('kn.claim_accept', true), '') is distinct from new.session_id::text || ':' || new.athlete_id::text then
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

revoke execute on function public.session_attendance_guard() from public, anon, authenticated;

-- ---- resolve: accept (-> present) or reject (reason required) ----
create or replace function public.resolve_attendance_claim(p_claim uuid, p_accept boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.attendance_claims%rowtype;
  g uuid;
  admin boolean := public.is_admin();
  note text := nullif(trim(p_note), '');
  prev text;
  new_status text := case when p_accept then 'accepted' else 'rejected' end;
begin
  if auth.uid() is null then
    raise exception 'errForbidden' using errcode = '42501';
  end if;

  select * into c from public.attendance_claims where id = p_claim for update;
  if not found then
    raise exception 'errNotFound' using errcode = '22023';
  end if;
  g := public.session_group(c.session_id);
  if not (admin or (public.is_coach(auth.uid()) and public.group_coach(g) = auth.uid())) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  if c.status <> 'open' then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  -- Coach deadline: 7 days after the claim was sent (admins exempt). Rejecting is always allowed.
  if p_accept and not admin and now() > c.created_at + interval '7 days' then
    raise exception 'errTooLate' using errcode = '22023';
  end if;
  if note is not null and length(note) > 300 then
    raise exception 'errReasonRequired' using errcode = '22023';
  end if;
  if not p_accept and (note is null or length(note) < 3) then
    raise exception 'errReasonRequired' using errcode = '22023';
  end if;

  select status into prev from public.session_attendance
   where session_id = c.session_id and athlete_id = c.athlete_id;

  if p_accept and prev is distinct from 'present' then
    perform set_config('kn.claim_accept', c.session_id::text || ':' || c.athlete_id::text, true);
    -- The 0036 guard still runs: 7-day window (admin exempt), membership check, recorded_by/updated_by = auth.uid().
    insert into public.session_attendance (session_id, athlete_id, status, recorded_by)
    values (c.session_id, c.athlete_id, 'present', auth.uid())
    on conflict (session_id, athlete_id) do update set status = 'present';
    perform set_config('kn.claim_accept', '', true);
  end if;

  perform set_config('kn.claim_resolve', '1', true);

  update public.attendance_claims
     set status = new_status, resolved_by = auth.uid(), resolved_at = now(), resolution_note = note
   where id = c.id;

  perform set_config('kn.claim_resolve', '', true);

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(),
          case when p_accept then 'attendance_claim.accept' else 'attendance_claim.reject' end,
          'attendance_claims', c.id,
          jsonb_build_object('status', c.status, 'attendance', coalesce(prev, 'not_recorded')),
          jsonb_build_object('status', new_status, 'note', note, 'session_id', c.session_id,
                             'athlete_id', c.athlete_id, 'attendance', case when p_accept then 'present' else coalesce(prev, 'not_recorded') end));
end;
$$;

revoke execute on function public.resolve_attendance_claim(uuid, boolean, text) from public, anon;
grant execute on function public.resolve_attendance_claim(uuid, boolean, text) to authenticated;
revoke execute on function public.attendance_claim_guard() from public, anon, authenticated;

-- ---- a cancelled session auto-rejects its open claims (system) ----
create or replace function public.reject_claims_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  perform set_config('kn.claim_resolve', '1', true);
  for c in select id, athlete_id from public.attendance_claims where session_id = new.id and status = 'open' for update loop
    update public.attendance_claims
       set status = 'rejected', resolved_at = now(), resolved_by = null, resolution_note = 'session cancelled'
     where id = c.id;
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'attendance_claim.reject', 'attendance_claims', c.id,
            jsonb_build_object('status', 'open'),
            jsonb_build_object('status', 'rejected', 'note', 'session cancelled', 'system', true,
                               'session_id', new.id, 'athlete_id', c.athlete_id));
  end loop;
  perform set_config('kn.claim_resolve', '', true);
  return new;
end;
$$;

drop trigger if exists trg_reject_claims_on_cancel on public.training_sessions;
create trigger trg_reject_claims_on_cancel after update of status on public.training_sessions
  for each row when (old.status = 'scheduled' and new.status = 'cancelled')
  execute function public.reject_claims_on_cancel();

revoke execute on function public.reject_claims_on_cancel() from public, anon, authenticated;
