-- 0028 — RLS for coach_athletes (was unprotected) + registration_type backfill. Additive & idempotent.

create or replace function public.is_coach(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'coach' and status = 'active')
$$;

alter table public.coach_athletes enable row level security;

drop policy if exists "ca_select" on public.coach_athletes;
create policy "ca_select" on public.coach_athletes for select
  using (athlete_id = auth.uid() or coach_id = auth.uid() or public.is_admin());

drop policy if exists "ca_admin_all" on public.coach_athletes;
create policy "ca_admin_all" on public.coach_athletes for all
  using (public.is_admin()) with check (public.is_admin());

-- Athlete requests a coach: only a pending, non-current link to a real coach, for themself.
drop policy if exists "ca_athlete_insert" on public.coach_athletes;
create policy "ca_athlete_insert" on public.coach_athletes for insert
  with check (athlete_id = auth.uid() and status = 'pending' and is_current = false and public.is_coach(coach_id));

-- Athlete may only cancel/end their own link (never activate it).
drop policy if exists "ca_athlete_update" on public.coach_athletes;
create policy "ca_athlete_update" on public.coach_athletes for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid() and status <> 'active' and is_current = false);

-- Coach approves / rejects links addressed to them.
drop policy if exists "ca_coach_update" on public.coach_athletes;
create policy "ca_coach_update" on public.coach_athletes for update
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Backfill: athletes who already have a coach link are 'team'; the rest stay 'individual'.
update public.profiles p set registration_type = 'team'
where p.role = 'athlete' and p.registration_type = 'individual'
  and (p.primary_coach_id is not null
       or exists (select 1 from public.coach_athletes ca
                  where ca.athlete_id = p.id and ca.status in ('pending','active')));
