-- 0009 — Memberships, certificates, media (see specs/02 §9,§10,§11)

create table membership_plans (
  id              uuid primary key default gen_random_uuid(),
  name_ar         text not null,
  name_en         text,
  description     jsonb,
  duration_months int not null default 12,
  price           numeric not null default 0,
  currency        char(3) not null default 'EGP',
  benefits        jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  plan_id     uuid not null references membership_plans(id),
  status      membership_status not null default 'pending',
  start_date  date,
  end_date    date,
  card_number text unique,
  qr_payload  text,
  qr_url      text,
  payment_id  uuid,
  auto_renew  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create table certificates (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id) on delete cascade,
  type       text not null,
  ref_id     uuid,
  title_ar   text,
  title_en   text,
  serial     text unique not null,
  pdf_url    text,
  qr_url     text,
  issued_by  uuid references profiles(id),
  issued_at  timestamptz not null default now(),
  expires_at timestamptz,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create table media_assets (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  context         text not null,
  ref_id          uuid,
  type            text not null default 'video',
  url             text not null,
  thumbnail_url   text,
  duration_seconds int,
  size_bytes      bigint,
  status          text not null default 'pending',
  reviewed_by     uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create index on memberships (profile_id, status);
create index on certificates (athlete_id);
create index on media_assets (owner_id, context);
