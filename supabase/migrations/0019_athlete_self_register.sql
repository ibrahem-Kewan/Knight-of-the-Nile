-- 0019 — Athlete self-registration
-- Athletes register simply and are active immediately (they can browse the site).
-- Their dashboard is gated in the app layer until a coach approves them.
-- Coach/Judge are still gated: a user requests the upgrade and an admin approves it.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, status, locale)
  values (new.id, new.email, 'athlete', 'active', 'ar');
  return new;
end; $$;
