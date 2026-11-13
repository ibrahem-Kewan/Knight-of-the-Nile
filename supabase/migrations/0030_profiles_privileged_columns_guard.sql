-- 0030 - Lock privileged profile columns against self-edit (security fix).
-- RLS cannot restrict columns, and profiles_update_self (0015) lets any user update
-- their own row. This BEFORE UPDATE trigger compares OLD/NEW for:
--   role, status, approved_by, approved_at, deleted_at, created_by
-- Rules:
--   * auth.uid() is null (service_role, migrations, SQL editor) -> allowed.
--   * only admin / super_admin may change those columns.
--   * super_admin is protected: its role/status/deleted_at cannot change, and nobody
--     can be promoted to super_admin through a user session.
--   * only super_admin may grant 'admin' or change role/status/deleted_at of an admin.
-- Additive and idempotent (create or replace / drop trigger if exists).

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed boolean;
  sensitive_changed boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  changed :=
       new.role        is distinct from old.role
    or new.status      is distinct from old.status
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
    or new.deleted_at  is distinct from old.deleted_at
    or new.created_by  is distinct from old.created_by;

  if not changed then
    return new;
  end if;

  if not public.is_admin() then
    raise exception 'profile_privileged_columns' using errcode = '42501';
  end if;

  sensitive_changed :=
       new.role       is distinct from old.role
    or new.status     is distinct from old.status
    or new.deleted_at is distinct from old.deleted_at;

  -- super_admin is protected
  if old.role = 'super_admin' and sensitive_changed then
    raise exception 'profile_super_admin_protected' using errcode = '42501';
  end if;

  -- nobody becomes super_admin via a user session
  if new.role = 'super_admin' and old.role <> 'super_admin' then
    raise exception 'profile_super_admin_protected' using errcode = '42501';
  end if;

  -- admins are managed by super_admin only
  if not public.is_super()
     and (old.role = 'admin' or new.role = 'admin')
     and sensitive_changed then
    raise exception 'profile_admin_super_only' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileged on public.profiles;
create trigger trg_profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();
