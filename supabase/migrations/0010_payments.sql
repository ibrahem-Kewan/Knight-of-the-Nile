-- 0010 — Payments abstraction (see specs/02 §12)

create table payments (
  id           uuid primary key default gen_random_uuid(),
  payer_id     uuid references profiles(id),
  provider     payment_provider not null default 'simulation',
  status       payment_status not null default 'pending',
  amount       numeric not null default 0,
  currency     char(3) not null default 'EGP',
  context      text,
  ref_id       uuid,
  external_ref text,
  raw_response jsonb,
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

-- wire deferred payment_id references
alter table tournament_registrations
  add constraint reg_payment_fk foreign key (payment_id) references payments(id);
alter table enrollments
  add constraint enrollment_payment_fk foreign key (payment_id) references payments(id);
alter table memberships
  add constraint membership_payment_fk foreign key (payment_id) references payments(id);

create index on payments (payer_id, status);
create index on payments (context, ref_id);
