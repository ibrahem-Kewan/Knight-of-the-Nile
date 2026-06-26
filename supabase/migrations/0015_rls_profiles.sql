-- 0015 — RLS for profiles (pattern; extend per table — see specs/04 §4)
alter table public.profiles enable row level security;

create policy "profiles_select_public" on public.profiles
  for select using (status = 'active' or id = auth.uid() or public.is_admin());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "profiles_coach_view_athletes" on public.profiles
  for select using (
    exists (
      select 1 from public.coach_athletes ca
      where ca.athlete_id = profiles.id and ca.coach_id = auth.uid() and ca.is_current
    )
  );
