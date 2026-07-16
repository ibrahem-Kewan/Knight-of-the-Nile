-- 0020 — Social links on profiles (for the personal profile page)
alter table profiles add column if not exists social jsonb not null default '{}'::jsonb;
-- shape: { "instagram": "", "facebook": "", "x": "", "whatsapp": "", "youtube": "" }
