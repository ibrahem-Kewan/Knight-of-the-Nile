-- 0034: training group membership (S3). An athlete may be in several groups of a coach.
-- Removal never deletes: left_at + removed_by are set, so attendance/payment history stays valid.

create table if not exists public.training_group_members (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.training_groups(id),
  athlete_id  uuid not null references public.profiles(id),
  joined_at   timestamptz not null default now(),
  left_at     timestamptz,
  added_by    uuid references public.profiles(id),
  removed_by  uuid references public.profiles(id),
  constraint tgm_left_after_joined check (left_at is null or left_at >= joined_at)
);

create unique index if not exists tgm_one_open on public.training_group_members (group_id, athlete_id) where left_at is null;
create index if not exists tgm_athlete_idx on public.training_group_members (athlete_id);
create index if not exists tgm_group_idx on public.training_group_members (group_id);

-- ---- helpers (security definer so they can read other RLS tables without recursion) ----
create or replace function public.group_coach(g uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select coach_id from public.training_groups where id = g;
$$;

create or replace function public.group_is_active(g uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_active from public.training_groups where id = g), false);
$$;

create or replace function public.is_my_active_athlete(a uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.coach_athletes
     where coach_id = auth.uid() and athlete_id = a and is_current and status = 'active');
$$;

create or replace function public.is_group_member(g uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.training_group_members
     where group_id = g and athlete_id = auth.uid() and left_at is null);
$$;

-- Branch of a group the current user belongs to (for the coach_branches member read policy).
create or replace function public.is_member_of_branch(b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.training_group_members m
      join public.training_groups g on g.id = m.group_id
     where g.branch_id = b and m.athlete_id = auth.uid() and m.left_at is null);
$$;

-- ---- guard: valid insert, immutable columns, removal bookkeeping ----
-- Non-admin callers cannot choose timestamps/bookkeeping: the DB sets them.
-- The internal flag 'kn.internal' is set (transaction-local) only by close_memberships_on_link_end().
create or replace function public.training_member_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  g_coach uuid;
  admin boolean := public.is_admin();
  internal boolean := coalesce(current_setting('kn.internal', true), '') = '1';
begin
  if tg_op = 'INSERT' then
    select coach_id into g_coach from public.training_groups where id = new.group_id and is_active;
    if g_coach is null then
      raise exception 'errGroupInactive' using errcode = '22023';
    end if;
    if not exists (select 1 from public.coach_athletes
                    where coach_id = g_coach and athlete_id = new.athlete_id
                      and is_current and status = 'active') then
      raise exception 'errNotYourAthlete' using errcode = '22023';
    end if;
    if not admin then
      new.joined_at := now();
      new.left_at := null;
      new.removed_by := null;
    end if;
    return new;
  end if;

  -- UPDATE: only the leave fields may change, and a leave cannot be undone.
  if new.id is distinct from old.id
     or new.group_id is distinct from old.group_id
     or new.athlete_id is distinct from old.athlete_id
     or new.joined_at is distinct from old.joined_at
     or new.added_by is distinct from old.added_by then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if old.left_at is not null
     and (new.left_at is distinct from old.left_at or new.removed_by is distinct from old.removed_by) then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if new.left_at is null then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  if not admin then
    new.left_at := now();
  end if;
  if not internal and new.removed_by is distinct from auth.uid() then
    raise exception 'errInvalid' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tgm_guard on public.training_group_members;
create trigger trg_tgm_guard before insert or update on public.training_group_members
  for each row execute function public.training_member_guard();

-- ---- audit: who (auth.uid()), when, what ----
create or replace function public.audit_training_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'training_member.add', 'training_group_members', new.id, null,
            jsonb_build_object('group_id', new.group_id, 'athlete_id', new.athlete_id, 'joined_at', new.joined_at));
  else
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'training_member.remove', 'training_group_members', new.id,
            jsonb_build_object('group_id', old.group_id, 'athlete_id', old.athlete_id, 'left_at', old.left_at),
            jsonb_build_object('group_id', new.group_id, 'athlete_id', new.athlete_id, 'left_at', new.left_at, 'removed_by', new.removed_by));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tgm_audit_insert on public.training_group_members;
create trigger trg_tgm_audit_insert after insert on public.training_group_members
  for each row execute function public.audit_training_member();

drop trigger if exists trg_tgm_audit_remove on public.training_group_members;
create trigger trg_tgm_audit_remove after update on public.training_group_members
  for each row when (old.left_at is null and new.left_at is not null)
  execute function public.audit_training_member();

-- ---- RLS ----
alter table public.training_group_members enable row level security;

drop policy if exists "tgm_select" on public.training_group_members;
create policy "tgm_select" on public.training_group_members for select
  using (athlete_id = auth.uid() or public.group_coach(group_id) = auth.uid() or public.is_admin());

drop policy if exists "tgm_insert" on public.training_group_members;
create policy "tgm_insert" on public.training_group_members for insert
  with check (
    public.is_coach(auth.uid())
    and public.group_coach(group_id) = auth.uid()
    and public.group_is_active(group_id)
    and public.is_my_active_athlete(athlete_id)
    and added_by = auth.uid()
    and left_at is null
  );

drop policy if exists "tgm_update" on public.training_group_members;
create policy "tgm_update" on public.training_group_members for update
  using (public.is_coach(auth.uid()) and public.group_coach(group_id) = auth.uid())
  with check (public.is_coach(auth.uid()) and public.group_coach(group_id) = auth.uid());

drop policy if exists "tgm_admin_all" on public.training_group_members;
create policy "tgm_admin_all" on public.training_group_members for all
  using (public.is_admin()) with check (public.is_admin());

-- No delete policy for coaches.

-- Members may read their own group and its branch (needed by athlete pages).
drop policy if exists "tg_member_select" on public.training_groups;
create policy "tg_member_select" on public.training_groups for select
  using (public.is_group_member(id));

drop policy if exists "cb_member_select" on public.coach_branches;
create policy "cb_member_select" on public.coach_branches for select
  using (public.is_member_of_branch(id));

-- ---- ending a coach link closes that athlete's open memberships with that coach ----
create or replace function public.close_memberships_on_link_end()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('kn.internal', '1', true);
  update public.training_group_members m
     set left_at = now(), removed_by = coalesce(auth.uid(), new.coach_id)
   where m.athlete_id = new.athlete_id
     and m.left_at is null
     and m.group_id in (select id from public.training_groups where coach_id = new.coach_id);
  perform set_config('kn.internal', '', true);
  return new;
end;
$$;

drop trigger if exists trg_coach_athletes_close_memberships on public.coach_athletes;
create trigger trg_coach_athletes_close_memberships after update on public.coach_athletes
  for each row
  when (old.is_current and old.status = 'active' and not (new.is_current and new.status = 'active'))
  execute function public.close_memberships_on_link_end();

-- ---- a coach may only answer pending requests addressed to them (not edit/end other links) ----
drop policy if exists "ca_coach_update" on public.coach_athletes;
create policy "ca_coach_update" on public.coach_athletes for update
  using (coach_id = auth.uid() and public.is_coach(auth.uid()) and status = 'pending')
  with check (coach_id = auth.uid() and status in ('active', 'rejected'));

-- ---- function privileges: helpers only for signed-in users; trigger functions for nobody ----
revoke execute on function public.group_coach(uuid), public.group_is_active(uuid),
  public.is_my_active_athlete(uuid), public.is_group_member(uuid), public.is_member_of_branch(uuid)
  from public, anon;
grant execute on function public.group_coach(uuid), public.group_is_active(uuid),
  public.is_my_active_athlete(uuid), public.is_group_member(uuid), public.is_member_of_branch(uuid)
  to authenticated;
revoke execute on function public.training_member_guard(), public.audit_training_member(),
  public.close_memberships_on_link_end() from public, anon, authenticated;
