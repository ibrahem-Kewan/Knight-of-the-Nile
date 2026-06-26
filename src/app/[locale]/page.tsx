import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeroArt } from "@/components/home/hero-art";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target, Crosshair, Medal, Trophy, Award, IdCard,
  GraduationCap, Languages, ArrowLeft, ArrowRight, Calendar, MapPin,
} from "lucide-react";

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("home");
  const ts = await getTranslations("sports");
  const isAr = locale === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const supabase = await createClient();

  const [{ data: tournaments }, { data: news }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, slug, title_ar, title_en, status, start_date, venue, scope")
      .neq("status", "draft")
      .order("start_date", { ascending: false })
      .limit(3),
    supabase
      .from("posts")
      .select("id, slug, title_ar, title_en, published_at, type")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const sports = [
    { key: "archery", icon: Target },
    { key: "horseback_archery", icon: Crosshair },
    { key: "equestrian", icon: Award },
  ] as const;

  const stats = [
    { k: "athletes", v: "2,000+" },
    { k: "tournaments", v: "120+" },
    { k: "coaches", v: "50+" },
    { k: "countries", v: "12" },
  ] as const;

  const features = [
    { icon: Medal, t: "rankingTitle", d: "rankingDesc" },
    { icon: IdCard, t: "certTitle", d: "certDesc" },
    { icon: GraduationCap, t: "coursesTitle", d: "coursesDesc" },
    { icon: Languages, t: "multiTitle", d: "multiDesc" },
  ] as const;

  const statusLabels: Record<string, { ar: string; en: string }> = {
    registration_open: { ar: "التسجيل مفتوح", en: "Registration open" },
    registration_closed: { ar: "التسجيل مغلق", en: "Registration closed" },
    ongoing: { ar: "جارية", en: "Ongoing" },
    completed: { ar: "منتهية", en: "Completed" },
    published: { ar: "منشورة", en: "Published" },
  };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-ink via-ink to-ink-700 text-sand">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #C9A227 0, transparent 40%), radial-gradient(circle at 80% 70%, #1E6091 0, transparent 40%)",
          }}
        />
        <div className="container relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="text-center md:text-start">
            <Badge variant="outline" className="mb-5 border-gold/40 text-gold">
              {t("badge")}
            </Badge>
            <h1 className="font-display text-5xl font-extrabold leading-tight text-gold md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-sand/85 md:mx-0">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Button asChild size="lg">
                <Link href="/register">
                  {t("ctaJoin")} <Arrow className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gold/50 text-gold hover:bg-gold/10">
                <Link href="/tournaments">{t("ctaExplore")}</Link>
              </Button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md drop-shadow-2xl">
            <HeroArt className="w-full" />
          </div>
        </div>

        {/* stats band */}
        <div className="relative border-t border-gold/15 bg-black/30">
          <div className="container grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.k} className="text-center">
                <div className="font-display text-3xl font-bold text-gold">{s.v}</div>
                <div className="text-sm text-sand/70">{t(`stats.${s.k}` as never)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPORTS */}
      <section className="container py-16">
        <header className="mb-10 text-center">
          <h2 className="font-display text-3xl text-gold">{t("sports")}</h2>
          <p className="mt-2 text-muted-foreground">{t("sportsSub")}</p>
        </header>
        <div className="grid gap-6 md:grid-cols-3">
          {sports.map((s) => (
            <Card key={s.key} className="group overflow-hidden transition-all hover:-translate-y-1 hover:border-gold hover:shadow-lg">
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-nile to-nile-bright">
                <s.icon className="h-12 w-12 text-sand transition-transform group-hover:scale-110" />
              </div>
              <CardHeader>
                <CardTitle>{ts(s.key)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {ts(`${s.key}Desc`)}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURED TOURNAMENTS */}
      <section className="border-y border-border bg-muted/30">
        <div className="container py-16">
          <header className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl text-gold">{t("featuredTournaments")}</h2>
              <p className="mt-2 text-muted-foreground">{t("featuredTournamentsSub")}</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link href="/tournaments">{t("featuredTournaments")} <Arrow className="h-4 w-4" /></Link>
            </Button>
          </header>
          {!tournaments?.length ? (
            <p className="text-muted-foreground">{t("noTournaments")}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {tournaments.map((tr) => (
                <Link key={tr.id} href={`/tournaments/${tr.slug}`}>
                  <Card className="h-full transition-all hover:-translate-y-1 hover:border-gold">
                    <div className="flex h-32 items-center justify-center bg-gradient-to-br from-gold/20 to-nile/20">
                      <Trophy className="h-10 w-10 text-gold" />
                    </div>
                    <CardHeader>
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="secondary">
                          {statusLabels[tr.status]?.[isAr ? "ar" : "en"] ?? tr.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{isAr ? tr.title_ar : tr.title_en ?? tr.title_ar}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {tr.venue && (
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {tr.venue}</span>
                      )}
                      {tr.start_date && (
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(tr.start_date).toLocaleDateString(locale)}</span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WHY */}
      <section className="container py-16">
        <h2 className="mb-10 text-center font-display text-3xl text-gold">{t("whyTitle")}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15 text-gold-deep">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">{t(`why.${f.t}` as never)}</h3>
              <p className="text-sm text-muted-foreground">{t(`why.${f.d}` as never)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEWS */}
      {news?.length ? (
        <section className="border-t border-border bg-muted/30">
          <div className="container py-16">
            <header className="mb-10 flex items-end justify-between">
              <h2 className="font-display text-3xl text-gold">{t("latestNews")}</h2>
              <Button asChild variant="ghost" className="hidden md:inline-flex">
                <Link href="/news">{t("latestNews")} <Arrow className="h-4 w-4" /></Link>
              </Button>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {news.map((p) => (
                <Link key={p.id} href={`/news/${p.slug}`}>
                  <Card className="h-full transition-all hover:-translate-y-1 hover:border-gold">
                    <div className="h-28 bg-gradient-to-br from-nile/30 to-gold/20" />
                    <CardHeader>
                      <CardTitle className="text-lg">{isAr ? p.title_ar : p.title_en ?? p.title_ar}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {p.published_at && new Date(p.published_at).toLocaleDateString(locale)}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA BANNER */}
      <section className="bg-gradient-to-r from-ink to-nile py-16 text-center text-sand">
        <div className="container">
          <h2 className="font-display text-3xl text-gold">{t("ctaBannerTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sand/85">{t("ctaBannerSub")}</p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/register">{t("ctaJoin")} <Arrow className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
