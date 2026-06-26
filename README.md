# فارس النيل — Knight of the Nile (proj)

منصة الرماية والرماية من على الخيل والفروسية. Next.js + TypeScript + Tailwind + shadcn/ui + Supabase + PWA + i18n (AR/EN).

> الوثائق الكاملة للتصميم والمعمارية في `../specs/` ودليل العمل في `../CLAUDE.md`.

## التشغيل المحلي

```bash
npm install
cp .env.local.example .env.local   # املأ مفاتيح Supabase
npx supabase start                  # قاعدة بيانات محلية (Docker)
npx supabase db reset               # تطبيق migrations + seed
npm run db:types                    # توليد أنواع TypeScript
npm run dev
```

## السكربتات

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل التطوير |
| `npm run build` / `start` | بناء/تشغيل الإنتاج |
| `npm run lint` / `typecheck` | الفحص |
| `npm run db:push` / `db:reset` / `db:types` | إدارة قاعدة البيانات |

## الحالة

- ✅ المرحلة 0 (التأسيس): البنية، i18n (AR/EN + RTL)، الثيم (نهاري/ليلي)، عملاء Supabase، middleware، الواجهة الأساسية، migrations الأولى (0001–0003, 0014, 0015) + seed.
- ⏳ المرحلة 1 (MVP): المصادقة، الأدوار، اللاعبون، البطولات، النتائج، التصنيفات، الأخبار. راجع `../specs/11-roadmap.md`.

## ملاحظات

- شغّل `shadcn` لإضافة مكوّنات الواجهة: `npx shadcn@latest add button input ...`.
- استبدل `src/types/database.types.ts` بالأنواع المولّدة من Supabase.
- ضع أيقونات PWA في `public/icons/` (192/512/512-maskable).
