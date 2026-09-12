import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { assets } from "@/config/assets";
import { TargetTabla60, TargetFace80 } from "@/components/home/targets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Flag,
  Shield,
  Trophy,
  MapPin,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Clock,
  GraduationCap,
  PlayCircle,
  ClipboardCheck,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Category = { key: string; icon: LucideIcon; en: string; cover: string; chips?: string[]; elite?: boolean };
type CourseTeaser = { key: string; icon: LucideIcon };

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("home");
  const ts = await getTranslations("sports");
  const td = await getTranslations("disciplines");
  const isAr = locale === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const supabase = await createClient();
  const profile = await getProfile();
  const isLoggedIn = Boolean(profile);

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, slug, title_ar, title_en, status, start_date, venue")
    .neq("status", "draft")
    .order("start_date", { ascending: false })
    .limit(3);

  const distances = [
    { n: "01", ar: "تمهيدي", en: "Novice", m: "10m" },
    { n: "02", ar: "ناشئين", en: "Junior", m: "20m" },
    { n: "03", ar: "متقدم", en: "Senior", m: "25m" },
    { n: "04", ar: "خبير", en: "Expert", m: "50m" },
    { n: "05", ar: "أساتذة", en: "Master", m: "70m" },
    { n: "06", ar: "أسطورة", en: "Legend", m: "100m" },
  ];

  // Three official top-level categories: الفروسية (equestrian) · الرماية (archery, split
  // into ground + horseback) · Black Knight (elite tier). Keys mirror sports.key /
  // disciplines.key in the database (supabase/seed.sql) and the "sports" / "disciplines"
  // message namespaces, so this stays in sync with the admin sports & tournament-category UI.
  const categories: Category[] = [
    { key: "equestrian", icon: Flag, en: "Equestrian", cover: assets.covers.horse, chips: [td("jumping")] },
    { key: "archery", icon: Target, en: "Archery", cover: assets.covers.target, chips: [td("ground_archery"), td("horseback_archery")] },
    { key: "black_knight", icon: Shield, en: "Black Knight", cover: assets.covers.gear, elite: true },
  ];

  // Courses are not live yet: this is a teaser section only (no links, no disabled
  // buttons) so nothing on it promises an action the platform can't deliver today.
  const courseTeasers: CourseTeaser[] = [
    { key: "certified", icon: GraduationCap },
    { key: "video", icon: PlayCircle },
    { key: "quiz", icon: ClipboardCheck },
    { key: "cert", icon: Award },
  ];

  const statusLabels: Record<string, { ar: string; en: string }> = {
    registration_open: { ar: "التسجيل مفتوح", en: "Registration open" },
    ongoing: { ar: "جارية", en: "Ongoing" },
    completed: { ar: "منتهية", en: "Completed" },
    published: { ar: "منشورة", en: "Published" },
    registration_closed: { ar: "التسجيل مغلق", en: "Closed" },
  };

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[88vh] overflow-hidden bg-ink text-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assets.hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div className="container relative flex min-h-[88vh] flex-col justify-center py-20">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-gold">{t("heroKicker")}</p>
          <h1 className="max-w-3xl font-display text-5xl font-extrabold leading-tight text-sand md:text-7xl">
            {t("heroArtTitle")}
          </h1>
          <p className="mt-4 text-lg text-gold/90">{t("heroArtEn")}</p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-sand/80">{t("heroArtPara")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/about">{t("exploreCategories")} <Arrow className="h-4 w-4" /></Link>
            </Button>
            {!isLoggedIn && (
              <Button asChild size="lg" variant="outline" className="border-gold/50 bg-transparent text-gold hover:bg-gold/10">
                <Link href="/register">{t("ctaJoin")}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* CATEGORIES — logged-in only */}
      {isLoggedIn && (
      <section id="categories" className="container py-20">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-gold">{t("catKicker")}</p>
        <h2 className="mt-2 text-center font-display text-4xl text-foreground">{t("catTitle")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">{t("catSub")}</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.key} className={`overflow-hidden ${c.elite ? "border-gold/60 bg-gradient-to-b from-ink to-ink-700 text-sand" : ""}`}>
              <div className="relative h-40 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.cover} alt={ts(c.key as never)} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              </div>
              <CardHeader>
                <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg ${c.elite ? "bg-gold text-ink" : "bg-gold/15 text-gold-deep"}`}>
                  <c.icon className="h-6 w-6" />
                </div>
                <CardTitle className={c.elite ? "text-gold" : ""}>{ts(c.key as never)}</CardTitle>
                <p className={`text-xs uppercase tracking-wide ${c.elite ? "text-sand/60" : "text-muted-foreground"}`}>{c.en}</p>
              </CardHeader>
              <CardContent>
                <p className={`text-sm ${c.elite ? "text-sand/80" : "text-muted-foreground"}`}>{ts(`${c.key}Desc` as never)}</p>
                {c.chips && c.chips.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.chips.map((ch) => (
                      <span key={ch} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{ch}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      )}

      {/* FEATURED TOURNAMENTS — section 3 · logged-in only */}
      {isLoggedIn && tournaments?.length ? (
        <section id="featured-tournaments" className="container py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl text-gold">{t("featuredTournaments")}</h2>
              <p className="mt-2 text-muted-foreground">{t("featuredTournamentsSub")}</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link href="/tournaments">{t("featuredTournaments")} <Arrow className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {tournaments.map((tr) => (
              <Link key={tr.id} href={`/tournaments/${tr.slug}`}>
                <Card className="h-full transition-all hover:-translate-y-1 hover:border-gold">
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-gold/20 to-nile/20">
                    <Trophy className="h-10 w-10 text-gold" />
                  </div>
                  <CardHeader>
                    <Badge variant="secondary" className="mb-1 w-fit">{statusLabels[tr.status]?.[isAr ? "ar" : "en"] ?? tr.status}</Badge>
                    <CardTitle className="text-lg">{isAr ? tr.title_ar : tr.title_en ?? tr.title_ar}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {tr.venue && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {tr.venue}</span>}
                    {tr.start_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(tr.start_date).toLocaleDateString(locale)}</span>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* COURSES — coming soon (teaser, no actions yet) */}
      <section id="courses" className="container py-20">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-gold/[0.08] via-card to-nile/[0.08] p-8 md:p-14">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-gold">{t("coursesKicker")}</p>
              <h2 className="mt-2 font-display text-4xl text-foreground">{t("coursesTitle")}</h2>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-deep dark:text-gold">
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                {t("coursesSoon")}
              </p>
              <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-muted-foreground">{t("coursesSub")}</p>
            </div>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {courseTeasers.map((f) => (
                <li
                  key={f.key}
                  className="rounded-xl border border-border bg-card/70 p-5 transition-colors hover:border-gold/60"
                >
                  <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15 text-gold-deep dark:text-gold">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="font-medium text-foreground">{t(`coursesFeat.${f.key}.title` as never)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t(`coursesFeat.${f.key}.desc` as never)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* DISTANCE LADDER — logged-in only */}
      {isLoggedIn && (
      <section id="distances" className="border-y border-border bg-muted/30">
        <div className="container py-20">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-gold">{t("distKicker")}</p>
          <h2 className="mt-2 text-center font-display text-4xl">{t("distTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">{t("distSub")}</p>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {distances.map((d) => (
              <div key={d.n} className="rounded-lg border border-border bg-card p-5 text-center transition-colors hover:border-gold">
                <div className="text-xs text-muted-foreground">{d.n}</div>
                <div className="mt-1 font-medium">{isAr ? d.ar : d.en}</div>
                <div className="mt-2 font-display text-2xl text-gold">{d.m}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* TARGET SPEC — logged-in only */}
      {isLoggedIn && (
      <section className="container grid items-center gap-10 py-20 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-gold">{t("specKicker")}</p>
          <h2 className="mt-2 font-display text-4xl">{t("specTitle")}</h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{t("specPara")}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <figure className="text-center">
            <TargetTabla60 className="mx-auto w-full max-w-[260px]" />
            <figcaption className="mt-3 font-display text-gold">الهدف الرسمي ٦٠×٦٠ سم</figcaption>
          </figure>
          <figure className="text-center">
            <TargetFace80 className="mx-auto w-full max-w-[260px]" />
            <figcaption className="mt-3 font-display text-gold">الهدف الرسمي ٨٠×٨٠ سم</figcaption>
          </figure>
        </div>
      </section>
      )}

      {/* GALLERY */}
      <section className="border-t border-border bg-muted/30">
        <div className="container py-20">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-gold">{t("galleryKicker")}</p>
          <h2 className="mt-2 text-center font-display text-4xl">{t("galleryTitle")}</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {assets.gallery.map((g) => (
              <figure key={g.src} className="group relative aspect-[3/4] overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={isAr ? g.ar : g.en} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4 font-display text-gold">
                  {isAr ? g.ar : g.en}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* JOURNEY CTA — guests only */}
      {!isLoggedIn && (
      <section className="relative overflow-hidden bg-ink py-24 text-center text-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assets.hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="container relative">
          <h2 className="font-display text-4xl text-gold">{t("journeyTitle")}</h2>
          <p className="mt-3 text-sand/80">{t("journeyEn")}</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/register">{t("ctaJoin")} <Arrow className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
      )}
    </>
  );
}
