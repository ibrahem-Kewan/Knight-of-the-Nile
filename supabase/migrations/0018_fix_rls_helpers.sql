-- 0018 - Make role helpers SECURITY DEFINER to avoid RLS recursion on profiles.
-- (A non-definer function that selects from profiles, when used inside a profiles
--  RLS policy, can trigger "infinite recursion detected in policy".)

create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid())
                       in ('super_admin','admin'), false) $$;

create or replace function public.is_super()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid())
                       = 'super_admin', false) $$;
