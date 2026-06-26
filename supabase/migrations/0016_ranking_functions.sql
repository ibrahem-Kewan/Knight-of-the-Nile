-- 0016 — Ranking engine (see specs/12 §3)

-- Recompute ranking positions for a given sport/discipline/scope/season.
create or replace function public.recompute_rankings(
  p_sport uuid,
  p_discipline uuid,
  p_scope ranking_scope,
  p_scope_ref uuid,
  p_season int
) returns void language plpgsql security definer set search_path = public as $$
begin
  -- aggregate points per athlete
  with agg as (
    select rp.athlete_id, sum(rp.points) as pts
    from ranking_points rp
    where rp.sport_id = p_sport
      and (p_discipline is null or rp.discipline_id = p_discipline)
      and rp.scope = p_scope
      and rp.season = p_season
    group by rp.athlete_id
  ), ranked as (
    select athlete_id, pts,
           rank() over (order by pts desc) as pos
    from agg
  )
  insert into rankings (athlete_id, sport_id, discipline_id, scope, scope_ref_id, total_points, position, season, computed_at)
  select r.athlete_id, p_sport, p_discipline, p_scope, p_scope_ref, r.pts, r.pos, p_season, now()
  from ranked r
  on conflict (athlete_id, sport_id, discipline_id, scope, scope_ref_id, season)
  do update set total_points = excluded.total_points,
                position     = excluded.position,
                computed_at  = now();
end; $$;

-- Approve a result: set final, award ranking points, trigger recompute.
create or replace function public.approve_result(p_result uuid, p_points numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r results%rowtype;
  t tournaments%rowtype;
  pts numeric;
begin
  select * into r from results where id = p_result;
  if not found then raise exception 'result % not found', p_result; end if;
  select * into t from tournaments where id = r.tournament_id;

  pts := coalesce(p_points, r.total_points);

  update results
    set status = 'final', approved_by = auth.uid(), approved_at = now(), updated_at = now()
    where id = p_result;

  -- award points (idempotent: clear previous for this result)
  delete from ranking_points where result_id = p_result;
  insert into ranking_points (athlete_id, sport_id, discipline_id, tournament_id, result_id, scope, points, season, earned_at)
  values (r.athlete_id, t.sport_id, r.discipline_id, t.id, p_result, t.scope, pts,
          extract(year from coalesce(t.start_date, now()))::int, now());

  perform public.recompute_rankings(
    t.sport_id, r.discipline_id, t.scope, null,
    extract(year from coalesce(t.start_date, now()))::int
  );
end; $$;
