-- 0004 — Geography & organizations (see specs/02 §3)

create table countries (
  id          uuid primary key default gen_random_uuid(),
  code        char(2) unique not null,
  name_ar     text not null,
  name_en     text not null,
  flag_url    text,
  phone_code  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table governorates (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references countries(id) on delete cascade,
  name_ar     text not null,
  name_en     text not null,
  code        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table organizations (
  id             uuid primary key default gen_random_uuid(),
  type           org_type not null default 'club',
  name_ar        text not null,
  name_en        text,
  slug           text unique not null,
  logo_url       text,
  description    jsonb,
  country_id     uuid references countries(id),
  governorate_id uuid references governorates(id),
  owner_id       uuid references profiles(id),
  parent_id      uuid references organizations(id),
  founded_year   int,
  contact        jsonb,
  is_verified    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz,
  deleted_at     timestamptz
);

create table organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  role_in_org     text,
  joined_at       timestamptz not null default now(),
  left_at         timestamptz,
  is_active       boolean not null default true
);

-- FKs from profiles (added now that targets exist)
alter table profiles add constraint profiles_country_fk
  foreign key (country_id) references countries(id);
alter table profiles add constraint profiles_governorate_fk
  foreign key (governorate_id) references governorates(id);
alter table profiles add constraint profiles_org_fk
  foreign key (organization_id) references organizations(id);

create index on governorates (country_id);
create index on organizations (type, country_id, governorate_id);
create index on profiles (country_id, governorate_id);
