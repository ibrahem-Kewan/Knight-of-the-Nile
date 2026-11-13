-- 0033: coach training groups (S2): schedule, sessions per cycle and monthly fee.
-- weekdays use Postgres extract(dow) numbering: 0 = Sunday ... 6 = Saturday. start_time is Africa/Cairo wall time.
-- No hard delete: deactivate instead.

-- Immutable shape check for smallint[] used as a set: 1-D, no nulls, no duplicates.
create or replace function public.int2_array_is_set(a smallint[])
returns boolean
language sql
immutable
as $$
  select a is not null
     and array_ndims(a) = 1
     and array_position(a, null) is null
     and cardinality(a) = (select count(distinct x) from unnest(a) as x);
$$;

create table if not exists public.training_groups (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references public.profiles(id),
  branch_id         uuid not null references public.coach_branches(id),
  sport_id          uuid references public.sports(id),
  name_ar           text not null check (length(trim(name_ar)) between 2 and 80),
  name_en           text check (name_en is null or length(name_en) <= 80),
  weekdays          smallint[] not null
                    constraint training_groups_weekdays_check
                    check (public.int2_array_is_set(weekdays)
                           and cardinality(weekdays) between 1 and 7
                           and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  start_time        time not null,
  duration_minutes  int not null default 90 check (duration_minutes between 15 and 480),
  sessions_per_cycle int not null check (sessions_per_cycle between 1 and 31),
  monthly_fee       numeric(10,2) not null check (monthly_fee >= 0),
  currency          char(3) not null default 'EGP' check (currency = 'EGP'),
  starts_on         date not null default ((now() at time zone 'Africa/Cairo')::date),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

create index if not exists training_groups_coach_active_idx on public.training_groups (coach_id, is_active);
create index if not exists training_groups_branch_idx on public.training_groups (branch_id);

drop trigger if exists trg_training_groups_updated on public.training_groups;
create trigger trg_training_groups_updated before update on public.training_groups
  for each row execute function public.set_updated_at();

-- Helper: does the current user own this branch?
create or replace function public.owns_branch(b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.coach_branches where id = b and coach_id = auth.uid());
$$;

-- The group's coach must be the owner of its branch (also holds for admin writes).
create or replace function public.training_group_branch_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b_active boolean;
begin
  select is_active into b_active from public.coach_branches
   where id = new.branch_id and coach_id = new.coach_id;
  if b_active is null then
    raise exception 'errBranch' using errcode = '22023';
  end if;
  -- New groups need an active branch; on update only when the branch is being changed.
  if not b_active and (tg_op = 'INSERT' or new.branch_id is distinct from old.branch_id) then
    raise exception 'errBranch' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_training_groups_branch_guard on public.training_groups;
create trigger trg_training_groups_branch_guard before insert or update of coach_id, branch_id on public.training_groups
  for each row execute function public.training_group_branch_guard();

alter table public.training_groups enable row level security;

drop policy if exists "tg_select" on public.training_groups;
create policy "tg_select" on public.training_groups for select
  using (coach_id = auth.uid() or public.is_admin());

drop policy if exists "tg_insert" on public.training_groups;
create policy "tg_insert" on public.training_groups for insert
  with check (coach_id = auth.uid() and public.is_coach(auth.uid()) and public.owns_branch(branch_id));

drop policy if exists "tg_update" on public.training_groups;
create policy "tg_update" on public.training_groups for update
  using (coach_id = auth.uid() and public.is_coach(auth.uid()))
  with check (coach_id = auth.uid() and public.is_coach(auth.uid()) and public.owns_branch(branch_id));

drop policy if exists "tg_admin_all" on public.training_groups;
create policy "tg_admin_all" on public.training_groups for all
  using (public.is_admin()) with check (public.is_admin());

-- No delete policy for coaches (history is kept; use is_active = false).

-- Audit group creation and changes to its terms: who (auth.uid()), when (created_at), before/after.
create or replace function public.audit_training_group_terms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b jsonb := null;
  a jsonb;
begin
  a := jsonb_build_object(
    'branch_id', new.branch_id, 'monthly_fee', new.monthly_fee,
    'sessions_per_cycle', new.sessions_per_cycle, 'weekdays', new.weekdays,
    'start_time', new.start_time, 'duration_minutes', new.duration_minutes,
    'starts_on', new.starts_on, 'is_active', new.is_active);
  if tg_op = 'UPDATE' then
    b := jsonb_build_object(
      'branch_id', old.branch_id, 'monthly_fee', old.monthly_fee,
      'sessions_per_cycle', old.sessions_per_cycle, 'weekdays', old.weekdays,
      'start_time', old.start_time, 'duration_minutes', old.duration_minutes,
      'starts_on', old.starts_on, 'is_active', old.is_active);
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(),
          case when tg_op = 'INSERT' then 'training_group.create' else 'training_group.update' end,
          'training_groups', new.id, b, a);
  return new;
end;
$$;

drop trigger if exists trg_training_groups_audit on public.training_groups;
create trigger trg_training_groups_audit after update on public.training_groups
  for each row
  when (old.branch_id is distinct from new.branch_id
     or old.monthly_fee is distinct from new.monthly_fee
     or old.sessions_per_cycle is distinct from new.sessions_per_cycle
     or old.weekdays is distinct from new.weekdays
     or old.start_time is distinct from new.start_time
     or old.duration_minutes is distinct from new.duration_minutes
     or old.starts_on is distinct from new.starts_on
     or old.is_active is distinct from new.is_active)
  execute function public.audit_training_group_terms();

drop trigger if exists trg_training_groups_audit_insert on public.training_groups;
create trigger trg_training_groups_audit_insert after insert on public.training_groups
  for each row execute function public.audit_training_group_terms();
