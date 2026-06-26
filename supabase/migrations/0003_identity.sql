-- 0003 — Identity & roles (see specs/02 §2)

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null default 'athlete',
  status          account_status not null default 'pending_approval',
  first_name_ar   text,
  last_name_ar    text,
  first_name_en   text,
  last_name_en    text,
  display_name    text,
  email           text,
  phone           text,
  gender          gender,
  birth_date      date,
  avatar_url      text,
  bio             jsonb,
  country_id      uuid,
  governorate_id  uuid,
  organization_id uuid,
  primary_coach_id uuid references profiles(id),
  created_by      uuid references profiles(id),
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  locale          text default 'ar',
  theme           text default 'system',
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  deleted_at      timestamptz
);

create table permissions (
  id             uuid primary key default gen_random_uuid(),
  key            text unique not null,
  description_ar text,
  description_en text
);

create table role_permissions (
  role          user_role not null,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role, permission_id)
);

create table coach_athletes (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references profiles(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  started_at date not null default current_date,
  ended_at   date,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (coach_id, athlete_id, started_at)
);

create index on profiles (role, status);
create index on coach_athletes (coach_id, is_current);
create index on coach_athletes (athlete_id, is_current);
