-- 0002 — Enum types (see specs/02-database-schema.md §1)
create type user_role          as enum ('super_admin','admin','coach','judge','athlete');
create type account_status     as enum ('pending_approval','active','suspended','rejected');
create type gender             as enum ('male','female');
create type tournament_status  as enum ('draft','published','registration_open','registration_closed','ongoing','completed','cancelled','archived');
create type registration_status as enum ('pending','approved','rejected','withdrawn','checked_in');
create type result_status      as enum ('draft','submitted','under_review','approved','disputed','final');
create type ranking_scope      as enum ('local','governorate','country','international');
create type course_status      as enum ('draft','published','archived');
create type enrollment_status  as enum ('pending','active','completed','refunded','cancelled');
create type payment_status     as enum ('pending','paid','failed','refunded','simulated');
create type payment_provider   as enum ('simulation','stripe','paypal','fawry','visa','mastercard');
create type post_type          as enum ('post','article','announcement');
create type post_status        as enum ('draft','pending_review','published','rejected','archived');
create type notification_channel as enum ('in_app','email','push');
create type membership_status   as enum ('pending','active','expired','cancelled');
create type complaint_status    as enum ('open','under_review','resolved','rejected');
create type org_type            as enum ('club','academy','team');
