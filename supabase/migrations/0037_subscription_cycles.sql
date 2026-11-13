-- 0037: monthly subscription cycles (S6). Append-only ledger: rows are written ONLY by the SECURITY DEFINER
-- functions below (no insert/update/delete privileges or policies). Mistakes are voided with a reason, never edited.
-- The balance (paid / consumed / remaining / due) is DERIVED by member_billing(), never stored.

create table if not exists public.subscription_cycles (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.training_groups(id),
  athlete_id    uuid not null references public.profiles(id),
  status        text not null check (status in ('declared', 'confirmed', 'rejected', 'void')),
  method        text not null default 'instapay' check (method in ('instapay', 'cash', 'other')),
  payment_ref   text check (payment_ref is null or length(payment_ref) <= 80),
  note          text check (note is null or length(note) <= 300),
  fee_amount    numeric(10,2) check (fee_amount is null or fee_amount >= 0),
  currency      char(3) not null default 'EGP',
  sessions_total int check (sessions_total is null or sessions_total between 1 and 31),
  declared_by   uuid not null references public.profiles(id),
  declared_at   timestamptz not null default now(),
  confirmed_by  uuid references public.profiles(id),
  confirmed_at  timestamptz,
  rejected_by   uuid references public.profiles(id),
  rejected_at   timestamptz,
  reject_reason text check (reject_reason is null or length(reject_reason) between 3 and 300),
  voided_by     uuid references public.profiles(id),
  voided_at     timestamptz,
  void_reason   text check (void_reason is null or length(void_reason) between 3 and 300),
  constraint sc_instapay_ref check (
    method <> 'instapay' or (payment_ref is not null and length(trim(payment_ref)) >= 3)),
  constraint sc_snapshot_check check (
    status = 'rejected' or (fee_amount is not null and sessions_total is not null)),
  constraint sc_confirmed_check check (
    status not in ('confirmed', 'void')
    or (fee_amount is not null and sessions_total is not null and confirmed_at is not null and confirmed_by is not null)),
  constraint sc_rejected_check check (
    status <> 'rejected' or (rejected_at is not null and rejected_by is not null and reject_reason is not null)),
  constraint sc_void_check check (
    status <> 'void' or (voided_at is not null and voided_by is not null and void_reason is not null))
);

create index if not exists sc_group_athlete_status_idx on public.subscription_cycles (group_id, athlete_id, status);
create index if not exists sc_declared_idx on public.subscription_cycles (status) where status = 'declared';
create unique index if not exists sc_one_open_declaration
  on public.subscription_cycles (group_id, athlete_id) where status = 'declared';

-- ---- RLS: read only; every write goes through the functions ----
alter table public.subscription_cycles enable row level security;

drop policy if exists "sc_select" on public.subscription_cycles;
create policy "sc_select" on public.subscription_cycles for select
  using (athlete_id = auth.uid() or public.group_coach(group_id) = auth.uid() or public.is_admin());

revoke insert, update, delete, truncate on public.subscription_cycles from anon, authenticated;

-- ---- helpers ----
-- Caller may act as the coach of the group (own group + still a coach) or is an admin.
create or replace function public.sc_can_coach(g uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select auth.uid() is not null
     and ((public.is_coach(auth.uid()) and public.group_coach(g) = auth.uid()) or public.is_admin());
$$;

create or replace function public.sc_clean(s text)
returns text language sql immutable as $$
  select case when nullif(trim(s), '') is null then null else trim(s) end;
$$;

create or replace function public.sc_audit(p_action text, p_id uuid, p_before jsonb, p_after jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), p_action, 'subscription_cycles', p_id, p_before, p_after);
$$;

-- Validates method / ref / note (also covered by check constraints).
create or replace function public.sc_validate(p_method text, p_ref text, p_note text)
returns void language plpgsql immutable as $$
begin
  if p_method is null or p_method not in ('instapay', 'cash', 'other') then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if length(coalesce(trim(p_ref), '')) > 80 or length(coalesce(trim(p_note), '')) > 300 then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if p_method = 'instapay' and length(coalesce(trim(p_ref), '')) < 3 then
    raise exception 'errRefRequired' using errcode = '22023';
  end if;
end;
$$;

-- ---- declare (athlete) ----
create or replace function public.declare_payment(p_group uuid, p_method text, p_ref text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  g public.training_groups%rowtype;
begin
  if uid is null then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  perform public.sc_validate(p_method, p_ref, p_note);
  select * into g from public.training_groups where id = p_group and is_active;
  if not found then
    raise exception 'errGroupInactive' using errcode = '22023';
  end if;
  if not exists (select 1 from public.training_group_members
                  where group_id = p_group and athlete_id = uid and left_at is null) then
    raise exception 'errNotGroupMember' using errcode = '42501';
  end if;
  if exists (select 1 from public.subscription_cycles
              where group_id = p_group and athlete_id = uid and status = 'declared') then
    raise exception 'errOpenDeclaration' using errcode = '22023';
  end if;

  begin
    -- Price snapshot at DECLARE time: this is the price the athlete saw and paid. Confirm keeps it.
    insert into public.subscription_cycles
      (group_id, athlete_id, status, method, payment_ref, note, fee_amount, currency, sessions_total, declared_by)
    values (p_group, uid, 'declared', p_method, public.sc_clean(p_ref), public.sc_clean(p_note),
            g.monthly_fee, g.currency, g.sessions_per_cycle, uid)
    returning id into new_id;
  exception when unique_violation then
    raise exception 'errOpenDeclaration' using errcode = '22023';
  end;

  perform public.sc_audit('subscription.declare', new_id, null,
    jsonb_build_object('group_id', p_group, 'athlete_id', uid, 'status', 'declared', 'method', p_method,
                       'payment_ref', public.sc_clean(p_ref), 'note', public.sc_clean(p_note),
                       'fee_amount', g.monthly_fee, 'currency', g.currency, 'sessions_total', g.sessions_per_cycle));
  return new_id;
end;
$$;

-- ---- confirm (coach): keeps the snapshot taken at declare time ----
create or replace function public.confirm_payment(p_cycle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.subscription_cycles%rowtype;
begin
  select * into c from public.subscription_cycles where id = p_cycle for update;
  if not found then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if not public.sc_can_coach(c.group_id) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  if c.status <> 'declared' then
    raise exception 'errInvalid' using errcode = '22023';
  end if;

  update public.subscription_cycles
     set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
   where id = p_cycle;

  perform public.sc_audit('subscription.confirm', p_cycle,
    jsonb_build_object('status', 'declared'),
    jsonb_build_object('status', 'confirmed', 'fee_amount', c.fee_amount, 'currency', c.currency,
                       'sessions_total', c.sessions_total, 'group_id', c.group_id, 'athlete_id', c.athlete_id));
end;
$$;

-- ---- reject (coach) ----
create or replace function public.reject_payment(p_cycle uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.subscription_cycles%rowtype;
  reason text := public.sc_clean(p_reason);
begin
  if reason is null or length(reason) not between 3 and 300 then
    raise exception 'errReasonRequired' using errcode = '22023';
  end if;
  select * into c from public.subscription_cycles where id = p_cycle for update;
  if not found then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if not public.sc_can_coach(c.group_id) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  if c.status <> 'declared' then
    raise exception 'errInvalid' using errcode = '22023';
  end if;

  update public.subscription_cycles
     set status = 'rejected', rejected_by = auth.uid(), rejected_at = now(), reject_reason = reason
   where id = p_cycle;

  perform public.sc_audit('subscription.reject', p_cycle,
    jsonb_build_object('status', 'declared'),
    jsonb_build_object('status', 'rejected', 'reject_reason', reason, 'group_id', c.group_id, 'athlete_id', c.athlete_id));
end;
$$;

-- ---- record (coach records a payment directly: confirmed at once, in the coach's name) ----
create or replace function public.record_payment(p_group uuid, p_athlete uuid, p_method text, p_ref text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g public.training_groups%rowtype;
  new_id uuid;
begin
  if not public.sc_can_coach(p_group) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  perform public.sc_validate(p_method, p_ref, p_note);
  -- Current or former member (a former member may still owe for sessions held while a member).
  if not exists (select 1 from public.training_group_members
                  where group_id = p_group and athlete_id = p_athlete) then
    raise exception 'errNotGroupMember' using errcode = '22023';
  end if;
  -- Avoid double counting: an open declaration must be confirmed or rejected first.
  if exists (select 1 from public.subscription_cycles
              where group_id = p_group and athlete_id = p_athlete and status = 'declared') then
    raise exception 'errOpenDeclaration' using errcode = '22023';
  end if;
  select * into g from public.training_groups where id = p_group;

  insert into public.subscription_cycles
    (group_id, athlete_id, status, method, payment_ref, note, fee_amount, currency, sessions_total,
     declared_by, confirmed_by, confirmed_at)
  values (p_group, p_athlete, 'confirmed', p_method, public.sc_clean(p_ref), public.sc_clean(p_note),
          g.monthly_fee, g.currency, g.sessions_per_cycle, auth.uid(), auth.uid(), now())
  returning id into new_id;

  perform public.sc_audit('subscription.record', new_id, null,
    jsonb_build_object('group_id', p_group, 'athlete_id', p_athlete, 'status', 'confirmed', 'method', p_method,
                       'payment_ref', public.sc_clean(p_ref), 'note', public.sc_clean(p_note),
                       'fee_amount', g.monthly_fee, 'currency', g.currency, 'sessions_total', g.sessions_per_cycle));
  return new_id;
end;
$$;

-- ---- void (coach): confirmed -> void with a reason; the row stays ----
create or replace function public.void_payment(p_cycle uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.subscription_cycles%rowtype;
  reason text := public.sc_clean(p_reason);
begin
  if reason is null or length(reason) not between 3 and 300 then
    raise exception 'errReasonRequired' using errcode = '22023';
  end if;
  select * into c from public.subscription_cycles where id = p_cycle for update;
  if not found then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if not public.sc_can_coach(c.group_id) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  if c.status <> 'confirmed' then
    raise exception 'errInvalid' using errcode = '22023';
  end if;

  update public.subscription_cycles
     set status = 'void', voided_by = auth.uid(), voided_at = now(), void_reason = reason
   where id = p_cycle;

  perform public.sc_audit('subscription.void', p_cycle,
    jsonb_build_object('status', 'confirmed', 'fee_amount', c.fee_amount, 'sessions_total', c.sessions_total),
    jsonb_build_object('status', 'void', 'void_reason', reason, 'group_id', c.group_id, 'athlete_id', c.athlete_id));
end;
$$;

-- ---- derived balance: single source of truth ----
-- Eligible sessions S: scheduled (not cancelled) sessions of the group inside ANY membership window of the athlete.
-- Capacity C: sum of sessions_total over CONFIRMED cycles. Consumed K: eligible sessions already started.
-- Cycles are contiguous from the first eligible session, so a late payment covers unpaid consumed sessions first,
-- prepayment accumulates, and cancelled sessions (holiday / coach absent) extend the cycle. Athlete absence is consumed.
create or replace function public.billing_calc(p_group uuid, p_athlete uuid)
returns table (paid_sessions int, consumed_sessions int, remaining_sessions int, unpaid_consumed int,
               is_due boolean, next_session_at timestamptz, last_covered_at timestamptz)
language sql stable security definer set search_path = public as $$
  with s as (
    select ts.scheduled_at, row_number() over (order by ts.scheduled_at, ts.id) as rn
      from public.training_sessions ts
     where ts.group_id = p_group
       and ts.status = 'scheduled'
       and exists (select 1 from public.training_group_members m
                    where m.group_id = p_group and m.athlete_id = p_athlete
                      and m.joined_at <= ts.scheduled_at
                      and (m.left_at is null or ts.scheduled_at < m.left_at))
  ),
  cap as (
    select coalesce(sum(sessions_total), 0)::int as c
      from public.subscription_cycles
     where group_id = p_group and athlete_id = p_athlete and status = 'confirmed'
  ),
  k as (select count(*)::int as k from s where scheduled_at <= now())
  select cap.c, k.k, greatest(cap.c - k.k, 0), greatest(k.k - cap.c, 0), (cap.c - k.k) <= 0,
         (select min(scheduled_at) from s where scheduled_at > now()),
         (select scheduled_at from s where rn = cap.c)
    from cap, k;
$$;

create or replace function public.member_billing(p_group uuid, p_athlete uuid)
returns table (paid_sessions int, consumed_sessions int, remaining_sessions int, unpaid_consumed int,
               is_due boolean, next_session_at timestamptz, last_covered_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null
     or not (p_athlete = auth.uid() or public.group_coach(p_group) = auth.uid() or public.is_admin()) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  return query select * from public.billing_calc(p_group, p_athlete);
end;
$$;

create or replace function public.group_billing(p_group uuid)
returns table (athlete_id uuid, is_member boolean, paid_sessions int, consumed_sessions int, remaining_sessions int,
               unpaid_consumed int, is_due boolean, next_session_at timestamptz, last_covered_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not (public.group_coach(p_group) = auth.uid() or public.is_admin()) then
    raise exception 'errForbidden' using errcode = '42501';
  end if;
  return query
    -- Open members, plus former members who still owe for sessions held while they were members.
    select m.athlete_id, m.is_member, b.paid_sessions, b.consumed_sessions, b.remaining_sessions, b.unpaid_consumed,
           b.is_due, b.next_session_at, b.last_covered_at
      from (select t.athlete_id, bool_or(t.left_at is null) as is_member
              from public.training_group_members t
             where t.group_id = p_group
             group by t.athlete_id) m
     cross join lateral public.billing_calc(p_group, m.athlete_id) b
     where m.is_member or b.unpaid_consumed > 0;
end;
$$;

-- ---- grants ----
revoke execute on function
  public.sc_can_coach(uuid), public.sc_clean(text), public.sc_audit(text, uuid, jsonb, jsonb),
  public.sc_validate(text, text, text), public.billing_calc(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function
  public.declare_payment(uuid, text, text, text), public.confirm_payment(uuid), public.reject_payment(uuid, text),
  public.record_payment(uuid, uuid, text, text, text), public.void_payment(uuid, text),
  public.member_billing(uuid, uuid), public.group_billing(uuid)
  from public, anon;
grant execute on function
  public.declare_payment(uuid, text, text, text), public.confirm_payment(uuid), public.reject_payment(uuid, text),
  public.record_payment(uuid, uuid, text, text, text), public.void_payment(uuid, text),
  public.member_billing(uuid, uuid), public.group_billing(uuid)
  to authenticated;

-- ---- session generation: longer horizon, and open members may trigger it (idempotent, future-only) ----
create or replace function public.ensure_group_sessions(p_group uuid, p_weeks int default 26)
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
          or public.is_admin()
          or public.is_group_member(p_group)) then
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
