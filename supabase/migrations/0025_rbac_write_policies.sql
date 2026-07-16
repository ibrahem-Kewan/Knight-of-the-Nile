-- 0025 — RBAC write policies (hierarchy). Extends 0017_rls_all (which was admin-write only).
-- Admin → all; creator → own; judge → coaches' content. Enforced at the DB (RLS) level,
-- matching the server-action guards.

-- Hierarchy helper: may the current user manage content created by `creator`?
create or replace function public.can_manage_creator(creator uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_admin()
    or creator = auth.uid()
    or (public.current_role() = 'judge'
        and (select role from public.profiles where id = creator) = 'coach');
$$;

-- ── Tournaments: creators can insert; owner/admin/judge-of-coach can manage ──
-- Read: managers (incl. a judge over a coach) can see drafts they manage.
create policy "tournaments_manage_read" on public.tournaments
  for select using (public.can_manage_creator(created_by));
create policy "tournaments_creator_insert" on public.tournaments
  for insert with check (
    created_by = auth.uid()
    and public.current_role() in ('super_admin','admin','coach','judge')
  );
create policy "tournaments_manage_update" on public.tournaments
  for update using (public.can_manage_creator(created_by))
  with check (public.can_manage_creator(created_by));
create policy "tournaments_manage_delete" on public.tournaments
  for delete using (public.can_manage_creator(created_by));

-- Tournament categories (disciplines): manageable by the tournament's manager
create policy "tdisc_owner_write" on public.tournament_disciplines
  for all
  using (exists (select 1 from public.tournaments t
                 where t.id = tournament_disciplines.tournament_id
                   and public.can_manage_creator(t.created_by)))
  with check (exists (select 1 from public.tournaments t
                 where t.id = tournament_disciplines.tournament_id
                   and public.can_manage_creator(t.created_by)));

-- ── Events: full RLS (mirrors tournaments) ──
alter table public.events enable row level security;
create policy "events_read" on public.events
  for select using (status <> 'draft' or public.can_manage_creator(created_by));
create policy "events_creator_insert" on public.events
  for insert with check (
    created_by = auth.uid()
    and public.current_role() in ('super_admin','admin','coach','judge')
  );
create policy "events_manage_update" on public.events
  for update using (public.can_manage_creator(created_by))
  with check (public.can_manage_creator(created_by));
create policy "events_manage_delete" on public.events
  for delete using (public.can_manage_creator(created_by));

alter table public.event_registrations enable row level security;
create policy "ereg_select" on public.event_registrations
  for select using (
    profile_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.events e
               where e.id = event_registrations.event_id and public.can_manage_creator(e.created_by))
  );
create policy "ereg_insert" on public.event_registrations
  for insert with check (profile_id = auth.uid() or public.is_admin());
create policy "ereg_manage" on public.event_registrations
  for update using (
    public.is_admin()
    or exists (select 1 from public.events e
               where e.id = event_registrations.event_id and public.can_manage_creator(e.created_by))
  );

-- ── Coach scoring: a coach may write results for their own active athletes ──
create policy "results_coach_write" on public.results
  for all
  using (public.current_role() = 'coach' and exists (
           select 1 from public.coach_athletes ca
           where ca.coach_id = auth.uid() and ca.athlete_id = results.athlete_id
             and ca.is_current and ca.status = 'active'))
  with check (public.current_role() = 'coach' and exists (
           select 1 from public.coach_athletes ca
           where ca.coach_id = auth.uid() and ca.athlete_id = results.athlete_id
             and ca.is_current and ca.status = 'active'));
