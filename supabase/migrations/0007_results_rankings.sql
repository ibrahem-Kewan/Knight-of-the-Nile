-- 0007 — Scoring, results, disputes, rankings (see specs/02 §6,§7)

create table scores (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references tournament_registrations(id) on delete cascade,
  judge_id        uuid not null references profiles(id),
  round           int not null default 1,
  raw             jsonb,
  points          numeric not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create table results (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references tournaments(id) on delete cascade,
  registration_id     uuid not null references tournament_registrations(id) on delete cascade,
  athlete_id          uuid not null references profiles(id),
  discipline_id       uuid not null references disciplines(id),
  total_points        numeric not null default 0,
  rank_in_discipline  int,
  medal               text,
  status              result_status not null default 'draft',
  approved_by         uuid references profiles(id),
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  unique (registration_id)
);

create table result_disputes (
  id          uuid primary key default gen_random_uuid(),
  result_id   uuid not null references results(id) on delete cascade,
  raised_by   uuid not null references profiles(id),
  reason      jsonb,
  status      complaint_status not null default 'open',
  resolution  jsonb,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create table ranking_points (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references profiles(id) on delete cascade,
  sport_id      uuid not null references sports(id),
  discipline_id uuid references disciplines(id),
  tournament_id uuid references tournaments(id),
  result_id     uuid references results(id) on delete cascade,
  scope         ranking_scope not null,
  points        numeric not null default 0,
  season        int not null default extract(year from now()),
  earned_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create table rankings (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references profiles(id) on delete cascade,
  sport_id      uuid not null references sports(id),
  discipline_id uuid references disciplines(id),
  scope         ranking_scope not null,
  scope_ref_id  uuid,
  total_points  numeric not null default 0,
  position      int,
  season        int not null default extract(year from now()),
  computed_at   timestamptz not null default now(),
  unique (athlete_id, sport_id, discipline_id, scope, scope_ref_id, season)
);

-- registrations.payment_id FK now that nothing else blocks
create index on results (tournament_id, discipline_id, rank_in_discipline);
create index on ranking_points (athlete_id, sport_id, season);
create index on rankings (sport_id, discipline_id, scope, scope_ref_id, season, position);
