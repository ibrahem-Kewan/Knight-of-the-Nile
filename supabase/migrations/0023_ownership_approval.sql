-- 0023 — Coach↔athlete approval + tournament/event audience scope. Additive & idempotent.

alter table coach_athletes add column if not exists status      text not null default 'active';
alter table coach_athletes add column if not exists approved_by uuid references profiles(id);
alter table coach_athletes add column if not exists approved_at timestamptz;
-- status: 'pending' (athlete requested this coach) | 'active' (coach approved) | 'rejected'

alter table tournaments add column if not exists audience text not null default 'public';
alter table events      add column if not exists audience text not null default 'public';
-- audience: 'public' | 'coach_athletes' (creator's athletes only)
