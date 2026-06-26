-- 0011 — News & posts (see specs/02 §13)

create table posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references profiles(id),
  type        post_type not null default 'post',
  status      post_status not null default 'draft',
  title_ar    text not null,
  title_en    text,
  slug        text unique not null,
  excerpt     jsonb,
  body        jsonb,
  cover_url   text,
  sport_id    uuid references sports(id),
  tags        text[],
  moderated_by uuid references profiles(id),
  published_at timestamptz,
  views       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  deleted_at  timestamptz
);

create table post_media (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references posts(id) on delete cascade,
  type      text not null default 'image',
  url       text not null,
  sort_order int not null default 0
);

create table comments (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body      text not null,
  status    text not null default 'visible',
  created_at timestamptz not null default now()
);

create index on posts (status, published_at desc);
create index on posts (type, sport_id);
