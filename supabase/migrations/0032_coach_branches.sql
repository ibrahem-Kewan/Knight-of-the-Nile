-- 0032: coach-owned training branches (S1 of coach training feature).
-- A branch belongs to the single coach who created it. No hard delete: deactivate instead.

create table if not exists public.coach_branches (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.profiles(id),
  name_ar        text not null check (length(trim(name_ar)) between 2 and 80),
  name_en        text check (name_en is null or length(name_en) <= 80),
  governorate_id uuid references public.governorates(id),
  address        text check (address is null or length(address) <= 200),
  map_url        text check (map_url is null or (length(map_url) <= 500 and map_url ~* '^https?://')),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists coach_branches_coach_active_idx on public.coach_branches (coach_id, is_active);

drop trigger if exists trg_coach_branches_updated on public.coach_branches;
create trigger trg_coach_branches_updated before update on public.coach_branches
  for each row execute function public.set_updated_at();

alter table public.coach_branches enable row level security;

drop policy if exists "cb_select" on public.coach_branches;
create policy "cb_select" on public.coach_branches for select
  using (coach_id = auth.uid() or public.is_admin());

drop policy if exists "cb_insert" on public.coach_branches;
create policy "cb_insert" on public.coach_branches for insert
  with check (coach_id = auth.uid() and public.is_coach(auth.uid()));

drop policy if exists "cb_update" on public.coach_branches;
create policy "cb_update" on public.coach_branches for update
  using (coach_id = auth.uid() and public.is_coach(auth.uid()))
  with check (coach_id = auth.uid() and public.is_coach(auth.uid()));

drop policy if exists "cb_admin_all" on public.coach_branches;
create policy "cb_admin_all" on public.coach_branches for all
  using (public.is_admin()) with check (public.is_admin());

-- No delete policy for coaches (history is kept; use is_active = false).
