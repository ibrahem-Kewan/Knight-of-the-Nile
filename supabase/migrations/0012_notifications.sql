-- 0012 — Notifications (see specs/02 §14)

create table notifications (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profiles(id) on delete cascade,
  channel   notification_channel not null default 'in_app',
  type      text not null,
  title_ar  text,
  title_en  text,
  body_ar   text,
  body_en   text,
  data      jsonb,
  read_at   timestamptz,
  sent_at   timestamptz,
  created_at timestamptz not null default now()
);

create table notification_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references profiles(id) on delete cascade,
  in_app     boolean not null default true,
  email      boolean not null default true,
  push       boolean not null default false,
  categories jsonb,
  updated_at timestamptz not null default now()
);

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text,
  auth       text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index on notifications (user_id, read_at);
