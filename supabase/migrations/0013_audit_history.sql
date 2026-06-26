-- 0013 — Audit, activity & history (see specs/02 §15)

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip          inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create table activity_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references profiles(id),
  type      text not null,
  meta      jsonb,
  ip        inet,
  created_at timestamptz not null default now()
);

create table coach_history (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references profiles(id) on delete cascade,
  event_type text not null,
  ref_id     uuid,
  summary    jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table judge_history (
  id            uuid primary key default gen_random_uuid(),
  judge_id      uuid not null references profiles(id) on delete cascade,
  tournament_id uuid references tournaments(id),
  results_count int not null default 0,
  summary       jsonb,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index on audit_logs (entity_type, entity_id);
create index on activity_logs (user_id, created_at desc);
