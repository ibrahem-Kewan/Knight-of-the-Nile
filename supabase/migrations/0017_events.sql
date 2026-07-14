-- 0017 — Events (a standalone entity, separate from tournaments)
-- Events are non-competitive activities (clinics, gatherings, exhibitions…).
-- No results/ranking logic — registration only.

create type event_status as enum (
  'draft','published','registration_open','registration_closed','ongoing','completed','cancelled'
);

create table events (
  id                 uuid primary key default gen_random_uuid(),
  sport_id           uuid references sports(id),            -- optional: an event may be cross-category
  title_ar           text not null,
  title_en           text,
  slug               text unique not null,
  description        jsonb,
  cover_url          text,
  status             event_status not null default 'draft',
  country_id         uuid references countries(id),
  governorate_id     uuid references governorates(id),
  organization_id    uuid references organizations(id),
  venue              text,
  start_date         timestamptz,
  end_date           timestamptz,
  registration_start timestamptz,
  registration_end   timestamptz,
  max_participants   int,
  fees               numeric not null default 0,
  currency           char(3) not null default 'EGP',
  created_by         uuid references profiles(id),
  approved_by        uuid references profiles(id),
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  deleted_at         timestamptz
);

create table event_registrations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  profile_id   uuid not null references profiles(id),
  registered_by uuid references profiles(id),
  status       registration_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  unique (event_id, profile_id)
);

create index on events (status, start_date);
create index on events (created_by);
create index on event_registrations (event_id, status);
create index on event_registrations (profile_id);

create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();
