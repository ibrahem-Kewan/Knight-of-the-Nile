-- 0005 — Sports, disciplines, categories, grades (see specs/02 §4)

create table sports (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name_ar     text not null,
  name_en     text not null,
  icon        text,
  description jsonb,
  is_active   boolean not null default true,
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);

create table disciplines (
  id             uuid primary key default gen_random_uuid(),
  sport_id       uuid not null references sports(id) on delete cascade,
  key            text not null,
  name_ar        text not null,
  name_en        text not null,
  description    jsonb,
  scoring_schema jsonb,
  max_score      numeric,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (sport_id, key)
);

create table age_categories (
  id        uuid primary key default gen_random_uuid(),
  sport_id  uuid not null references sports(id) on delete cascade,
  name_ar   text not null,
  name_en   text not null,
  min_age   int,
  max_age   int,
  gender    gender,
  is_active boolean not null default true
);

create table grades (
  id        uuid primary key default gen_random_uuid(),
  sport_id  uuid not null references sports(id) on delete cascade,
  name_ar   text not null,
  name_en   text not null,
  level     int not null,
  min_points numeric not null default 0,
  badge_url text,
  created_at timestamptz not null default now()
);

create index on disciplines (sport_id, is_active);
create index on grades (sport_id, level);
