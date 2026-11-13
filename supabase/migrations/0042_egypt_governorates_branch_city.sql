-- 0042: all 27 Egyptian governorates (ISO 3166-2) + free-text city/center on coach branches.
-- Idempotent: never updates or deletes existing rows; skips a governorate when the same
-- country already has one with the same code or the same Arabic name.

insert into public.countries (code, name_ar, name_en, phone_code, is_active)
select 'EG', 'مصر', 'Egypt', '+20', true
where not exists (select 1 from public.countries where code = 'EG');

insert into public.governorates (country_id, name_ar, name_en, code, is_active)
select c.id, v.name_ar, v.name_en, v.code, true
from public.countries c
cross join (values
  ('EG-C',   'القاهرة',        'Cairo'),
  ('EG-GZ',  'الجيزة',         'Giza'),
  ('EG-ALX', 'الإسكندرية',     'Alexandria'),
  ('EG-KB',  'القليوبية',      'Qalyubia'),
  ('EG-SHR', 'الشرقية',        'Sharqia'),
  ('EG-DK',  'الدقهلية',       'Dakahlia'),
  ('EG-GH',  'الغربية',        'Gharbia'),
  ('EG-MNF', 'المنوفية',       'Monufia'),
  ('EG-BH',  'البحيرة',        'Beheira'),
  ('EG-KFS', 'كفر الشيخ',      'Kafr El Sheikh'),
  ('EG-DT',  'دمياط',          'Damietta'),
  ('EG-PTS', 'بورسعيد',        'Port Said'),
  ('EG-IS',  'الإسماعيلية',    'Ismailia'),
  ('EG-SUZ', 'السويس',         'Suez'),
  ('EG-SIN', 'شمال سيناء',     'North Sinai'),
  ('EG-JS',  'جنوب سيناء',     'South Sinai'),
  ('EG-FYM', 'الفيوم',         'Faiyum'),
  ('EG-BNS', 'بني سويف',       'Beni Suef'),
  ('EG-MN',  'المنيا',         'Minya'),
  ('EG-AST', 'أسيوط',          'Asyut'),
  ('EG-SHG', 'سوهاج',          'Sohag'),
  ('EG-KN',  'قنا',            'Qena'),
  ('EG-LX',  'الأقصر',         'Luxor'),
  ('EG-ASN', 'أسوان',          'Aswan'),
  ('EG-BA',  'البحر الأحمر',   'Red Sea'),
  ('EG-WAD', 'الوادي الجديد',  'New Valley'),
  ('EG-MT',  'مطروح',          'Matrouh')
) as v(code, name_ar, name_en)
where c.code = 'EG'
  and not exists (
    select 1 from public.governorates g
    where g.country_id = c.id and (g.code = v.code or g.name_ar = v.name_ar or lower(g.name_en) = lower(v.name_en))
  );

alter table public.coach_branches add column if not exists city text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_branches_city_len') then
    alter table public.coach_branches add constraint coach_branches_city_len
      check (city is null or char_length(btrim(city)) between 2 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_branches_city_needs_gov') then
    alter table public.coach_branches add constraint coach_branches_city_needs_gov
      check (city is null or governorate_id is not null);
  end if;
end $$;
