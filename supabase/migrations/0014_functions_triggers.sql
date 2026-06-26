-- 0014 — Core functions & triggers (see specs/04 §2,§5)

-- updated_at auto
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- new auth user -> profile + notification prefs
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, status, locale)
  values (new.id, new.email, 'athlete', 'pending_approval', 'ar');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- role helpers
create or replace function public.current_role() returns user_role
language sql stable as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.current_role() in ('super_admin','admin') $$;

create or replace function public.is_super() returns boolean
language sql stable as $$ select public.current_role() = 'super_admin' $$;
