-- 0017 — Enable RLS + baseline policies for remaining tables (see specs/04 §4)
-- Pattern: public read for published reference data; writes via admin/owner; RLS is last line of defense.

-- Reference data: public read, admin write
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'countries','governorates','sports','disciplines','age_categories','grades',
    'organizations','membership_plans'
  ] loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format($f$create policy "%1$s_read" on public.%1$I for select using (true);$f$, tbl);
    execute format($f$create policy "%1$s_admin_write" on public.%1$I for all using (public.is_admin()) with check (public.is_admin());$f$, tbl);
  end loop;
end $$;

-- Tournaments: public read of published, admin write
alter table public.tournaments enable row level security;
create policy "tournaments_public_read" on public.tournaments
  for select using (status <> 'draft' or public.is_admin() or created_by = auth.uid());
create policy "tournaments_admin_write" on public.tournaments
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.tournament_disciplines enable row level security;
create policy "tdisc_read" on public.tournament_disciplines for select using (true);
create policy "tdisc_admin" on public.tournament_disciplines for all using (public.is_admin()) with check (public.is_admin());

-- Registrations: athlete/coach/admin
alter table public.tournament_registrations enable row level security;
create policy "reg_select" on public.tournament_registrations for select using (
  athlete_id = auth.uid() or public.is_admin()
  or exists (select 1 from coach_athletes ca where ca.coach_id = auth.uid() and ca.athlete_id = tournament_registrations.athlete_id and ca.is_current)
);
create policy "reg_insert" on public.tournament_registrations for insert with check (
  athlete_id = auth.uid() or public.is_admin()
  or exists (select 1 from coach_athletes ca where ca.coach_id = auth.uid() and ca.athlete_id = tournament_registrations.athlete_id and ca.is_current)
);
create policy "reg_admin_update" on public.tournament_registrations for update using (public.is_admin()) with check (public.is_admin());

alter table public.tournament_staff enable row level security;
create policy "tstaff_read" on public.tournament_staff for select using (true);
create policy "tstaff_admin" on public.tournament_staff for all using (public.is_admin()) with check (public.is_admin());

-- Scores: judge assigned + admin
alter table public.scores enable row level security;
create policy "scores_rw" on public.scores for all using (
  public.is_admin() or (
    judge_id = auth.uid() and exists (
      select 1 from tournament_staff ts
      join tournament_registrations rg on rg.id = scores.registration_id
      where ts.tournament_id = rg.tournament_id and ts.profile_id = auth.uid()
        and ts.role_in_tournament in ('judge','scorer')
    )
  )
) with check (public.is_admin() or judge_id = auth.uid());

-- Results: public read approved/final; admin/judge write
alter table public.results enable row level security;
create policy "results_read" on public.results for select using (
  status in ('approved','final') or public.is_admin() or athlete_id = auth.uid()
);
create policy "results_staff_write" on public.results for all using (
  public.is_admin() or current_role() = 'judge'
) with check (public.is_admin() or current_role() = 'judge');

alter table public.result_disputes enable row level security;
create policy "disputes_select" on public.result_disputes for select using (raised_by = auth.uid() or public.is_admin() or current_role() = 'judge');
create policy "disputes_insert" on public.result_disputes for insert with check (raised_by = auth.uid());
create policy "disputes_resolve" on public.result_disputes for update using (public.is_admin() or current_role() = 'judge');

-- Rankings & points: public read
alter table public.rankings enable row level security;
create policy "rankings_read" on public.rankings for select using (true);
alter table public.ranking_points enable row level security;
create policy "rpoints_read" on public.ranking_points for select using (true);

-- Posts: published public; author/admin manage
alter table public.posts enable row level security;
create policy "posts_read" on public.posts for select using (status = 'published' or author_id = auth.uid() or public.is_admin());
create policy "posts_insert" on public.posts for insert with check (author_id = auth.uid() and current_role() in ('super_admin','admin','coach','judge'));
create policy "posts_update_own" on public.posts for update using (author_id = auth.uid() or public.is_admin());

-- Courses: published public; owner/admin manage
alter table public.courses enable row level security;
create policy "courses_read" on public.courses for select using (status = 'published' or owner_id = auth.uid() or public.is_admin());
create policy "courses_write_own" on public.courses for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- Enrollments / memberships / certificates / payments / notifications: owner + admin
alter table public.enrollments enable row level security;
create policy "enroll_own" on public.enrollments for all using (athlete_id = auth.uid() or public.is_admin()) with check (athlete_id = auth.uid() or public.is_admin());

alter table public.memberships enable row level security;
create policy "mem_own" on public.memberships for select using (profile_id = auth.uid() or public.is_admin());
create policy "mem_admin" on public.memberships for all using (public.is_admin()) with check (public.is_admin());

alter table public.certificates enable row level security;
create policy "cert_read" on public.certificates for select using (true); -- public verify by serial
create policy "cert_admin" on public.certificates for all using (public.is_admin() or issued_by = auth.uid()) with check (public.is_admin() or issued_by = auth.uid());

alter table public.payments enable row level security;
create policy "pay_own" on public.payments for select using (payer_id = auth.uid() or public.is_admin());

alter table public.notifications enable row level security;
create policy "notif_own" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.notification_preferences enable row level security;
create policy "notifpref_own" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.media_assets enable row level security;
create policy "media_own" on public.media_assets for all using (owner_id = auth.uid() or public.is_admin() or current_role() in ('judge','coach')) with check (owner_id = auth.uid() or public.is_admin());

-- Audit/history: admin read only
alter table public.audit_logs enable row level security;
create policy "audit_admin" on public.audit_logs for select using (public.is_admin());
alter table public.activity_logs enable row level security;
create policy "activity_admin" on public.activity_logs for select using (public.is_admin() or user_id = auth.uid());
