-- 0018 — Coach↔athlete approval + tournament audience scope
-- Additive & idempotent.

-- Coach approval of athletes who chose this coach at signup.
alter table coach_athletes add column if not exists status      text not null default 'active';
alter table coach_athletes add column if not exists approved_by uuid references profiles(id);
alter table coach_athletes add column if not exists approved_at timestamptz;
-- status: 'pending' (athlete requested this coach) | 'active' (coach approved) | 'rejected'

-- Tournament audience: coach-created tournaments are for that coach's athletes only.
alter table tournaments add column if not exists audience text not null default 'public';
-- audience: 'public' (open to all eligible athletes) | 'coach_athletes' (creator's athletes only)

-- Same idea for events.
alter table events add column if not exists audience text not null default 'public';
