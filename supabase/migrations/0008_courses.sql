-- 0008 — Courses / LMS (see specs/02 §8)

create table courses (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references profiles(id),
  sport_id            uuid references sports(id),
  title_ar            text not null,
  title_en            text,
  slug                text unique not null,
  description         jsonb,
  cover_url           text,
  price               numeric not null default 0,
  currency            char(3) not null default 'EGP',
  level               text,
  status              course_status not null default 'draft',
  lessons_count       int not null default 0,
  certificate_enabled boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  deleted_at          timestamptz
);

create table course_modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses(id) on delete cascade,
  title_ar   text not null,
  title_en   text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid references course_modules(id) on delete cascade,
  course_id        uuid not null references courses(id) on delete cascade,
  title_ar         text not null,
  title_en         text,
  content          jsonb,
  video_url        text,
  duration_seconds int,
  sort_order       int not null default 0,
  is_preview       boolean not null default false,
  created_at       timestamptz not null default now()
);

create table lesson_resources (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references lessons(id) on delete cascade,
  type       text not null default 'pdf',
  title      text,
  url        text not null,
  created_at timestamptz not null default now()
);

create table quizzes (
  id        uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  title_ar  text,
  title_en  text,
  pass_score int not null default 60,
  created_at timestamptz not null default now()
);

create table quiz_questions (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references quizzes(id) on delete cascade,
  question   jsonb not null,
  options    jsonb,
  correct    jsonb,
  points     int not null default 1,
  sort_order int not null default 0
);

create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  athlete_id  uuid not null references profiles(id) on delete cascade,
  status      enrollment_status not null default 'pending',
  payment_id  uuid,
  progress    numeric not null default 0,
  completed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (course_id, athlete_id)
);

create table quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references quizzes(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  answers    jsonb,
  score      numeric not null default 0,
  passed     boolean not null default false,
  created_at timestamptz not null default now()
);

create table lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  completed     boolean not null default false,
  watched_seconds int not null default 0,
  updated_at    timestamptz not null default now(),
  unique (enrollment_id, lesson_id)
);

create index on courses (status, sport_id);
create index on lessons (course_id, sort_order);
create index on enrollments (athlete_id, status);
