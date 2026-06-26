-- 0006 — Tournaments (see specs/02 §5)

create table tournaments (
  id                 uuid primary key default gen_random_uuid(),
  sport_id           uuid not null references sports(id),
  title_ar           text not null,
  title_en           text,
  slug               text unique not null,
  description        jsonb,
  cover_url          text,
  status             tournament_status not null default 'draft',
  country_id         uuid references countries(id),
  governorate_id     uuid references governorates(id),
  organization_id    uuid references organizations(id),
  scope              ranking_scope not null default 'local',
  venue              text,
  start_date         timestamptz,
  end_date           timestamptz,
  registration_start timestamptz,
  registration_end   timestamptz,
  max_participants   int,
  participation_terms jsonb,
  fees               numeric not null default 0,
  currency           char(3) not null default 'EGP',
  created_by         uuid references profiles(id),
  approved_by        uuid references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  deleted_at         timestamptz
);

create table tournament_disciplines (
  id                 uuid primary key default gen_random_uuid(),
  tournament_id      uuid not null references tournaments(id) on delete cascade,
  discipline_id      uuid not null references disciplines(id),
  age_category_id    uuid references age_categories(id),
  max_per_discipline int,
  unique (tournament_id, discipline_id, age_category_id)
);

create table tournament_registrations (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  athlete_id      uuid not null references profiles(id),
  discipline_id   uuid not null references disciplines(id),
  age_category_id uuid references age_categories(id),
  registered_by   uuid references profiles(id),
  status          registration_status not null default 'pending',
  bib_number      text,
  payment_id      uuid,
  checked_in_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  unique (tournament_id, athlete_id, discipline_id)
);

create table tournament_staff (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references tournaments(id) on delete cascade,
  profile_id          uuid not null references profiles(id),
  role_in_tournament  text not null default 'judge',
  created_at          timestamptz not null default now(),
  unique (tournament_id, profile_id, role_in_tournament)
);

create index on tournaments (status, start_date);
create index on tournaments (sport_id, country_id, governorate_id);
create index on tournament_registrations (tournament_id, status);
create index on tournament_registrations (athlete_id);
