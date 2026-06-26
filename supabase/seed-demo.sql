-- =====================================================================
--  فارس النيل — Demo seed (run ONCE in Supabase SQL Editor)
--  Creates demo login accounts + sample tournaments, results, rankings,
--  news and courses so the whole site can be explored.
--
--  Demo password for ALL accounts:  Fares@1234
--    admin@fares.test  (super_admin)
--    coach@fares.test  (coach)
--    judge@fares.test  (judge)
--    sara@fares.test / omar@fares.test / layla@fares.test  (athletes)
--
--  Safe to re-run (idempotent via fixed IDs + ON CONFLICT).
-- =====================================================================

-- 0) Base reference data ------------------------------------------------
insert into sports (key, name_ar, name_en, sort_order, is_active) values
  ('archery','الرماية','Archery',1,true),
  ('horseback_archery','الرماية من على الخيل','Horseback Archery',2,true),
  ('equestrian','الفروسية','Equestrian',3,true)
on conflict (key) do nothing;

insert into countries (code, name_ar, name_en, phone_code, is_active) values
  ('EG','مصر','Egypt','+20',true),
  ('SA','السعودية','Saudi Arabia','+966',true),
  ('AE','الإمارات','United Arab Emirates','+971',true)
on conflict (code) do nothing;

insert into governorates (country_id, name_ar, name_en, code, is_active)
select c.id, v.ar, v.en, v.code, true
from countries c
join (values ('القاهرة','Cairo','CAI'),('الجيزة','Giza','GIZ'),('الإسكندرية','Alexandria','ALX')) as v(ar,en,code) on true
where c.code='EG'
and not exists (select 1 from governorates g where g.name_en=v.en and g.country_id=c.id);

insert into disciplines (sport_id, key, name_ar, name_en, max_score, is_active)
select s.id, d.key, d.ar, d.en, d.max, true
from sports s
join (values
  ('archery','target_18m','هدف 18 متر','Target 18m',300),
  ('archery','target_70m','هدف 70 متر','Target 70m',300),
  ('horseback_archery','tabla_t4','مسار الطبلة T4','Tabla T4',100),
  ('horseback_archery','qabaq_q6','مسار القبق Q6','Qabaq Q6',100),
  ('equestrian','show_jumping','قفز الحواجز','Show Jumping',100)
) as d(skey,key,ar,en,max) on s.key=d.skey
where not exists (select 1 from disciplines x where x.sport_id=s.id and x.key=d.key);

insert into grades (sport_id, name_ar, name_en, level, min_points)
select s.id, g.ar, g.en, g.level, g.minp
from sports s
join (values
  ('مبتدئ','Beginner',1,0),('متوسط','Intermediate',2,100),
  ('متقدم','Advanced',3,300),('محترف','Pro',4,600)
) as g(ar,en,level,minp) on true
where s.key='archery'
and not exists (select 1 from grades x where x.sport_id=s.id and x.level=g.level);

insert into membership_plans (name_ar, name_en, description, duration_months, price, currency, is_active)
select 'العضوية السنوية','Annual Membership','{"ar":"عضوية سنوية كاملة","en":"Full annual membership"}'::jsonb,12,300,'EGP',true
where not exists (select 1 from membership_plans);

-- 1) Demo auth users + identities --------------------------------------
-- handle_new_user() trigger auto-creates a matching profiles row.
do $$
declare
  u record;
  pwd text := crypt('Fares@1234', gen_salt('bf'));
begin
  for u in
    select * from (values
      ('a0000000-0000-0000-0000-000000000001'::uuid,'admin@fares.test'),
      ('a0000000-0000-0000-0000-000000000002'::uuid,'coach@fares.test'),
      ('a0000000-0000-0000-0000-000000000003'::uuid,'judge@fares.test'),
      ('a0000000-0000-0000-0000-000000000004'::uuid,'sara@fares.test'),
      ('a0000000-0000-0000-0000-000000000005'::uuid,'omar@fares.test'),
      ('a0000000-0000-0000-0000-000000000006'::uuid,'layla@fares.test')
    ) as t(id,email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated','authenticated',
      u.email, pwd, now(), now(), now(),
      '{"provider":"email","providers":["email"]}','{}','','','',''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email),
      'email', u.id::text, now(), now(), now()
    ) on conflict do nothing;
  end loop;
end $$;

-- 2) Flesh out profiles -------------------------------------------------
update profiles set
  role='super_admin', status='active', first_name_ar='مدير', last_name_ar='النظام',
  first_name_en='System', last_name_en='Admin', display_name='مدير النظام',
  country_id=(select id from countries where code='EG'),
  governorate_id=(select id from governorates where name_en='Cairo')
where id='a0000000-0000-0000-0000-000000000001';

update profiles set
  role='coach', status='active', first_name_ar='أحمد', last_name_ar='الشربيني',
  first_name_en='Ahmed', last_name_en='Elsherbiny', display_name='الكابتن أحمد الشربيني',
  country_id=(select id from countries where code='EG'),
  governorate_id=(select id from governorates where name_en='Giza')
where id='a0000000-0000-0000-0000-000000000002';

update profiles set
  role='judge', status='active', first_name_ar='منى', last_name_ar='عبدالله',
  first_name_en='Mona', last_name_en='Abdullah', display_name='الحكم منى عبدالله',
  country_id=(select id from countries where code='EG'),
  governorate_id=(select id from governorates where name_en='Cairo')
where id='a0000000-0000-0000-0000-000000000003';

update profiles set role='athlete', status='active', first_name_ar='سارة', last_name_ar='محمود',
  first_name_en='Sara', last_name_en='Mahmoud', display_name='سارة محمود', gender='female',
  country_id=(select id from countries where code='EG'),
  governorate_id=(select id from governorates where name_en='Cairo'),
  primary_coach_id='a0000000-0000-0000-0000-000000000002'
where id='a0000000-0000-0000-0000-000000000004';

update profiles set role='athlete', status='active', first_name_ar='عمر', last_name_ar='حسن',
  first_name_en='Omar', last_name_en='Hassan', display_name='عمر حسن', gender='male',
  country_id=(select id from countries where code='EG'),
  governorate_id=(select id from governorates where name_en='Giza'),
  primary_coach_id='a0000000-0000-0000-0000-000000000002'
where id='a0000000-0000-0000-0000-000000000005';

update profiles set role='athlete', status='active', first_name_ar='ليلى', last_name_ar='كمال',
  first_name_en='Layla', last_name_en='Kamal', display_name='ليلى كمال', gender='female',
  country_id=(select id from countries where code='EG'),
  governorate_id=(select id from governorates where name_en='Alexandria'),
  primary_coach_id='a0000000-0000-0000-0000-000000000002'
where id='a0000000-0000-0000-0000-000000000006';

-- coach ↔ athletes links
insert into coach_athletes (coach_id, athlete_id, is_current)
select 'a0000000-0000-0000-0000-000000000002', a, true
from (values
  ('a0000000-0000-0000-0000-000000000004'::uuid),
  ('a0000000-0000-0000-0000-000000000005'::uuid),
  ('a0000000-0000-0000-0000-000000000006'::uuid)
) as t(a)
where not exists (
  select 1 from coach_athletes ca
  where ca.coach_id='a0000000-0000-0000-0000-000000000002' and ca.athlete_id=t.a
);

-- 3) Tournaments --------------------------------------------------------
insert into tournaments (id, sport_id, title_ar, title_en, slug, description, status, scope,
  country_id, governorate_id, venue, start_date, end_date, registration_start, registration_end,
  max_participants, fees, currency, created_by)
values
  ('b0000000-0000-0000-0000-000000000001',
   (select id from sports where key='archery'),
   'بطولة النيل المفتوحة للرماية','Nile Open Archery',
   'nile-open-archery',
   '{"ar":"بطولة مفتوحة لكل الفئات على هدف 18 و70 متر.","en":"Open tournament across categories on 18m and 70m targets."}',
   'registration_open','country',
   (select id from countries where code='EG'),
   (select id from governorates where name_en='Cairo'),
   'استاد القاهرة الدولي', now()+interval '20 day', now()+interval '22 day',
   now()-interval '2 day', now()+interval '15 day', 120, 200, 'EGP',
   'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002',
   (select id from sports where key='horseback_archery'),
   'كأس فرسان النيل للرماية من على الخيل','Knights of the Nile HBA Cup',
   'knights-hba-cup',
   '{"ar":"منافسة الطبلة والقبق لأفضل فرسان الرماية.","en":"Tabla and Qabaq competition for the best mounted archers."}',
   'ongoing','international',
   (select id from countries where code='EG'),
   (select id from governorates where name_en='Giza'),
   'ميدان الأهرامات', now()-interval '1 day', now()+interval '1 day',
   now()-interval '20 day', now()-interval '3 day', 60, 350, 'EGP',
   'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003',
   (select id from sports where key='archery'),
   'دوري الإسكندرية الشتوي','Alexandria Winter League',
   'alexandria-winter-league',
   '{"ar":"الجولة الختامية لدوري الإسكندرية.","en":"Final round of the Alexandria league."}',
   'completed','governorate',
   (select id from countries where code='EG'),
   (select id from governorates where name_en='Alexandria'),
   'نادي الإسكندرية الرياضي', now()-interval '30 day', now()-interval '28 day',
   now()-interval '50 day', now()-interval '33 day', 80, 0, 'EGP',
   'a0000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- staff: assign judge to completed tournament
insert into tournament_staff (tournament_id, profile_id, role_in_tournament)
select 'b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','judge'
where not exists (select 1 from tournament_staff where tournament_id='b0000000-0000-0000-0000-000000000003' and profile_id='a0000000-0000-0000-0000-000000000003');

-- 4) Completed tournament: registrations + results + ranking points -----
do $$
declare
  disc uuid := (select id from disciplines where key='target_18m');
  sport uuid := (select id from sports where key='archery');
  t3 uuid := 'b0000000-0000-0000-0000-000000000003';
  rec record;
begin
  for rec in
    select * from (values
      ('a0000000-0000-0000-0000-000000000004'::uuid, 278, 1, 'gold'),
      ('a0000000-0000-0000-0000-000000000006'::uuid, 264, 2, 'silver'),
      ('a0000000-0000-0000-0000-000000000005'::uuid, 251, 3, 'bronze')
    ) as t(athlete, pts, pos, medal)
  loop
    insert into tournament_registrations (id, tournament_id, athlete_id, discipline_id, registered_by, status)
    values (gen_random_uuid(), t3, rec.athlete, disc, 'a0000000-0000-0000-0000-000000000002', 'approved')
    on conflict (tournament_id, athlete_id, discipline_id) do nothing;

    insert into results (tournament_id, registration_id, athlete_id, discipline_id, total_points, rank_in_discipline, medal, status, approved_by, approved_at)
    select t3, r.id, rec.athlete, disc, rec.pts, rec.pos, rec.medal, 'final', 'a0000000-0000-0000-0000-000000000003', now()
    from tournament_registrations r
    where r.tournament_id=t3 and r.athlete_id=rec.athlete and r.discipline_id=disc
    on conflict (registration_id) do nothing;

    insert into ranking_points (athlete_id, sport_id, discipline_id, tournament_id, scope, points, season)
    select rec.athlete, sport, disc, t3, 'governorate', rec.pts, extract(year from now())::int
    where not exists (select 1 from ranking_points rp where rp.athlete_id=rec.athlete and rp.tournament_id=t3);

    insert into rankings (athlete_id, sport_id, discipline_id, scope, total_points, position, season)
    values (rec.athlete, sport, disc, 'governorate', rec.pts, rec.pos, extract(year from now())::int)
    on conflict (athlete_id, sport_id, discipline_id, scope, scope_ref_id, season)
    do update set total_points=excluded.total_points, position=excluded.position;
  end loop;
end $$;

-- 5) News posts ---------------------------------------------------------
insert into posts (author_id, type, status, title_ar, title_en, slug, excerpt, body, sport_id, published_at)
values
  ('a0000000-0000-0000-0000-000000000001','announcement','published',
   'انطلاق التسجيل في بطولة النيل المفتوحة','Registration open for Nile Open',
   'nile-open-registration',
   '{"ar":"سجّل الآن قبل امتلاء المقاعد.","en":"Register now before seats fill up."}',
   '{"ar":"يسر إدارة فارس النيل الإعلان عن فتح باب التسجيل في بطولة النيل المفتوحة للرماية لجميع الفئات.","en":"Knight of the Nile is pleased to open registration for the Nile Open Archery across all categories."}',
   (select id from sports where key='archery'), now()-interval '2 day'),
  ('a0000000-0000-0000-0000-000000000002','article','published',
   'نصائح لتحسين ثبات القوس','Tips to improve your bow stability',
   'bow-stability-tips',
   '{"ar":"خمس خطوات عملية لرماية أدق.","en":"Five practical steps for more accurate shooting."}',
   '{"ar":"الثبات أساس الدقة. ابدأ بوقفة متوازنة، تنفّس بهدوء، وثبّت نقطة الإرساء...","en":"Stability is the basis of accuracy. Start with a balanced stance, breathe calmly, and anchor consistently..."}',
   (select id from sports where key='archery'), now()-interval '5 day')
on conflict (slug) do nothing;

-- 6) Courses ------------------------------------------------------------
insert into courses (owner_id, sport_id, title_ar, title_en, slug, description, price, currency, level, status, lessons_count, certificate_enabled)
values
  ('a0000000-0000-0000-0000-000000000002',(select id from sports where key='archery'),
   'أساسيات الرماية للمبتدئين','Archery Basics for Beginners','archery-basics',
   '{"ar":"دورة شاملة من الصفر حتى أول إصابة في المنتصف.","en":"A complete course from zero to your first bullseye."}',
   0,'EGP','مبتدئ','published',8,true),
  ('a0000000-0000-0000-0000-000000000002',(select id from sports where key='horseback_archery'),
   'مقدمة في الرماية من على الخيل','Intro to Horseback Archery','intro-hba',
   '{"ar":"تعلّم التوازن والرماية أثناء الحركة.","en":"Learn balance and shooting in motion."}',
   500,'EGP','متوسط','published',12,true)
on conflict (slug) do nothing;

-- 7) Active membership for one athlete (digital card demo)
insert into memberships (profile_id, plan_id, status, start_date, end_date, card_number)
select 'a0000000-0000-0000-0000-000000000004', p.id, 'active', current_date, current_date + interval '1 year', 'FN-2026-0001'
from membership_plans p
where p.is_active
  and not exists (select 1 from memberships m where m.profile_id='a0000000-0000-0000-0000-000000000004')
limit 1;

-- done
