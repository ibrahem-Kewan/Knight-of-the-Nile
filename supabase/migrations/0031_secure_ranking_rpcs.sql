-- 0031 — Secure approve_result / recompute_rankings (PR-2)
-- approve_result stays SECURITY DEFINER (it writes protected ranking tables), so the
-- caller check lives inside it. recompute_rankings is no longer callable from clients.

create or replace function public.approve_result(p_result uuid, p_points numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r results%rowtype;
  t tournaments%rowtype;
  pts numeric;
  old_status text;
  old_points numeric;
begin
  select * into r from results where id = p_result;
  if not found then raise exception 'result % not found', p_result; end if;
  select * into t from tournaments where id = r.tournament_id;

  -- Caller check (auth.uid() is null only for service-role / internal calls).
  if auth.uid() is not null then
    if not (
      public.is_admin()
      or public.current_role() = 'judge'
      or (
        public.current_role() = 'coach'
        and exists (
          select 1 from coach_athletes ca
          where ca.coach_id = auth.uid()
            and ca.athlete_id = r.athlete_id
            and ca.is_current = true
            and ca.status = 'active'
        )
      )
    ) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  pts := coalesce(p_points, r.total_points);
  if pts is null or pts < 0 then
    raise exception 'invalid_points' using errcode = '22023';
  end if;

  old_status := r.status::text;
  old_points := r.total_points;

  update results
    set status = 'final', approved_by = auth.uid(), approved_at = now(), updated_at = now()
    where id = p_result;

  -- award points (idempotent: clear previous for this result)
  delete from ranking_points where result_id = p_result;
  insert into ranking_points (athlete_id, sport_id, discipline_id, tournament_id, result_id, scope, points, season, earned_at)
  values (r.athlete_id, t.sport_id, r.discipline_id, t.id, p_result, t.scope, pts,
          extract(year from coalesce(t.start_date, now()))::int, now());

  insert into audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'result.approve', 'results', p_result,
          jsonb_build_object('status', old_status, 'points', old_points),
          jsonb_build_object('status', 'final', 'points', pts));

  perform public.recompute_rankings(
    t.sport_id, r.discipline_id, t.scope, null,
    extract(year from coalesce(t.start_date, now()))::int
  );
end; $$;

revoke execute on function public.recompute_rankings(uuid, uuid, ranking_scope, uuid, int) from public, anon, authenticated;
grant execute on function public.recompute_rankings(uuid, uuid, ranking_scope, uuid, int) to service_role;

revoke execute on function public.approve_result(uuid, numeric) from public, anon;
grant execute on function public.approve_result(uuid, numeric) to authenticated, service_role;
