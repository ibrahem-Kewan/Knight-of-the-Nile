-- Seed — base reference data (run after migrations)
-- ─────────────────────────────────────────────────────────────
-- Taxonomy (per client, Cpt. Abdelrahman El-Sherbiny):
--   Top-level categories (sports):   الفروسية · الرماية · Black Knight
--   Sub-categories (disciplines):
--     الفروسية  → القفز
--     الرماية   → الرماية الأرضية · الرماية من على ظهر الخيل
--     Black Knight → (elite tier, disciplines added later)
-- ─────────────────────────────────────────────────────────────

-- Categories (sports)
insert into sports (id, key, name_ar, name_en, image_url, tagline_ar, tagline_en, sort_order, is_active) values
  (gen_random_uuid(), 'equestrian',   'الفروسية',       'Equestrian',   '/images/categories/equestrian.svg',   'مهارة الفارس والجواد',      'The art of horse & rider',   1, true),
  (gen_random_uuid(), 'archery',      'الرماية',        'Archery',      '/images/categories/archery.svg',      'دقة التصويب وفنون الرماية',  'Precision and the bow',      2, true),
  (gen_random_uuid(), 'black_knight', 'الفارس الأسود',  'Black Knight', '/images/categories/black-knight.svg', 'فئة النخبة — بالدعوة فقط',   'The elite tier — by invite', 3, true)
on conflict (key) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en,
  image_url = excluded.image_url, tagline_ar = excluded.tagline_ar,
  tagline_en = excluded.tagline_en, sort_order = excluded.sort_order;

-- Sub-categories (disciplines)
insert into disciplines (id, sport_id, key, name_ar, name_en, is_active) values
  (gen_random_uuid(), (select id from sports where key = 'equestrian'), 'jumping',            'القفز',                    'Jumping',           true),
  (gen_random_uuid(), (select id from sports where key = 'archery'),    'ground_archery',     'الرماية الأرضية',          'Ground Archery',    true),
  (gen_random_uuid(), (select id from sports where key = 'archery'),    'horseback_archery',  'الرماية من على ظهر الخيل', 'Horseback Archery', true)
on conflict (sport_id, key) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en, is_active = excluded.is_active;

-- Countries (Egypt first)
insert into countries (id, code, name_ar, name_en, phone_code, is_active) values
  (gen_random_uuid(), 'EG', 'مصر',          'Egypt',                '+20',  true),
  (gen_random_uuid(), 'SA', 'السعودية',     'Saudi Arabia',         '+966', true),
  (gen_random_uuid(), 'AE', 'الإمارات',     'United Arab Emirates', '+971', true)
on conflict do nothing;

-- Membership plan
insert into membership_plans (id, name_ar, name_en, duration_months, price, currency, is_active) values
  (gen_random_uuid(), 'العضوية السنوية', 'Annual Membership', 12, 0, 'EGP', true)
on conflict do nothing;

-- Permissions (sample)
insert into permissions (key, description_ar, description_en) values
  ('user.approve',    'اعتماد المستخدمين',   'Approve users'),
  ('tournament.create','إنشاء بطولة',        'Create tournament'),
  ('event.create',    'إنشاء فعالية',        'Create event'),
  ('result.approve',  'اعتماد النتائج',      'Approve results'),
  ('post.moderate',   'الإشراف على المحتوى', 'Moderate content')
on conflict do nothing;
