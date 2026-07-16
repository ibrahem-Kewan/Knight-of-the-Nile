-- 0026 — InstaPay manual checkout (until a payment gateway is integrated)

-- New provider value (usable in later transactions/runtime).
alter type payment_provider add value if not exists 'instapay';

-- Admin-editable InstaPay recipient shown at checkout (single row).
create table if not exists payment_settings (
  id              int primary key default 1,
  instapay_name   text default '',
  instapay_handle text default '',
  instapay_phone  text default '',
  instructions_ar text default '',
  instructions_en text default '',
  updated_at      timestamptz default now(),
  constraint payment_settings_single_row check (id = 1)
);

insert into payment_settings (id) values (1) on conflict (id) do nothing;

alter table payment_settings enable row level security;
create policy "psettings_read"  on payment_settings for select using (true);
create policy "psettings_admin" on payment_settings for all using (public.is_admin()) with check (public.is_admin());

-- Let a payer insert their own pending payment (manual InstaPay transfer record).
create policy "pay_insert_own" on public.payments for insert with check (payer_id = auth.uid());
create policy "pay_admin_update" on public.payments for update using (public.is_admin()) with check (public.is_admin());
