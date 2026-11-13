-- 0029 — One registration per email + one open coach request per athlete. Additive & idempotent.
-- Rule (client request, 12 Nov 2026):
--   • An email creates one account only (enforced by auth.users; handled with a clear message in registerAction).
--   • A team athlete cannot file a new coach request, change coach, or switch to individual
--     while a previous request is still 'pending' — only after the coach approves or rejects it.
--   • An admin can still resolve a stuck request (ca_admin_all is unchanged).

-- 1) Data clean-up before the unique index: if an athlete already has several pending requests,
--    keep the newest one and close the older ones as 'ended' (history kept, nothing deleted).
update public.coach_athletes ca
set status = 'ended', is_current = false, ended_at = coalesce(ca.ended_at, current_date)
where ca.status = 'pending'
  and exists (
    select 1 from public.coach_athletes newer
    where newer.athlete_id = ca.athlete_id
      and newer.status = 'pending'
      and (newer.created_at, newer.id) > (ca.created_at, ca.id)
  );

-- 2) At most one pending request per athlete (DB-level guarantee, also blocks double-submit races).
create unique index if not exists coach_athletes_one_pending_per_athlete
  on public.coach_athletes (athlete_id)
  where status = 'pending';

-- 3) The athlete may no longer touch a pending request (cancel / end / re-point it) — only the coach
--    (ca_coach_update) or an admin (ca_admin_all) can answer it. Ending an active link and re-opening
--    a rejected one stay allowed, exactly as in 0028.
drop policy if exists "ca_athlete_update" on public.coach_athletes;
create policy "ca_athlete_update" on public.coach_athletes for update
  using (athlete_id = auth.uid() and status <> 'pending')
  with check (athlete_id = auth.uid() and status <> 'active' and is_current = false);
