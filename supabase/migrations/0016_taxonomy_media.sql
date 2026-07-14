-- 0016 — Category/discipline media (Arabic-themed cover images)
-- Additive & idempotent. Adds cover image columns used by home + category pages.

alter table sports      add column if not exists image_url text;
alter table disciplines add column if not exists image_url text;

-- Optional short tagline shown under a category card (bilingual).
alter table sports add column if not exists tagline_ar text;
alter table sports add column if not exists tagline_en text;
