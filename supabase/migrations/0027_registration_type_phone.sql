-- 0027 — Registration type (individual / team) on profiles. Phone column already exists (0003).
-- Additive and idempotent. Existing rows default to 'individual'.
alter table public.profiles
  add column if not exists registration_type text not null default 'individual';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_registration_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_registration_type_check
      check (registration_type in ('individual', 'team'));
  end if;
end $$;

-- Individuals never have a primary coach (enforced at DB level too).
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_individual_no_coach_check'
  ) then
    alter table public.profiles
      add constraint profiles_individual_no_coach_check
      check (registration_type = 'team' or primary_coach_id is null) not valid;
  end if;
end $$;
-- RLS: no change needed — profiles_update_self already covers the user's own row,
-- and the Server Action sets these fields only for the signed-up user.
