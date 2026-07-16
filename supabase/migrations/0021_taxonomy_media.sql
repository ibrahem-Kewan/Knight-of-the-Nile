-- 0021 — Category/discipline media (Arabic-themed cover images)
-- Additive & idempotent.

alter table sports      add column if not exists image_url text;
alter table disciplines add column if not exists image_url text;
alter table sports add column if not exists tagline_ar text;
alter table sports add column if not exists tagline_en text;
