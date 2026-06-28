-- 0019 - Role upgrade requests (athlete -> coach/judge), approved by admins.
create table if not exists role_requests (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  requested_role user_role not null,
  status        text not null default 'pending',  -- pending | approved | rejected
  note          text,
  reviewed_by   uuid references profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists role_requests_status_idx on role_requests (status, created_at);
create index if not exists role_requests_profile_idx on role_requests (profile_id);

alter table role_requests enable row level security;

-- athlete: see & create own requests
create policy "rr_select_own" on role_requests
  for select using (profile_id = auth.uid() or public.is_admin());
create policy "rr_insert_own" on role_requests
  for insert with check (profile_id = auth.uid());
-- admins manage
create policy "rr_admin_update" on role_requests
  for update using (public.is_admin()) with check (public.is_admin());
