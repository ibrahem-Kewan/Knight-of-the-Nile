-- Seed — base reference data (run after migrations)
-- Sports
insert into sports (id, key, name_ar, name_en, sort_order, is_active) values
  (gen_random_uuid(), 'archery',           'الرماية',                 'Archery',            1, true),
  (gen_random_uuid(), 'horseback_archery', 'الرماية من على الخيل',    'Horseback Archery',  2, true),
  (gen_random_uuid(), 'equestrian',        'الفروسية',                'Equestrian',         3, true)
on conflict do nothing;

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
  ('user.approve',   'اعتماد المستخدمين',  'Approve users'),
  ('tournament.create','إنشاء بطولة',       'Create tournament'),
  ('result.approve', 'اعتماد النتائج',      'Approve results'),
  ('post.moderate',  'الإشراف على المحتوى', 'Moderate content')
on conflict do nothing;
