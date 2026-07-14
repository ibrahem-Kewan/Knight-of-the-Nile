import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { assets } from "@/config/assets";
import { Button } from "@/components/ui/button";
import { Target, Crosshair, Award, Gem, Landmark, Scale, Users } from "lucide-react";

export default async function AboutPage() {
  const t = await getTranslations("about");
  const ts = await getTranslations("sports");

  const values = [
    { icon: Gem, t: "v1Title", d: "v1" },
    { icon: Landmark, t: "v2Title", d: "v2" },
    { icon: Scale, t: "v3Title", d: "v3" },
    { icon: Users, t: "v4Title", d: "v4" },
  ] as const;

  const sports = [
    { icon: Award, key: "equestrian" },
    { icon: Target, key: "archery" },
    { icon: Crosshair, key: "black_knight" },
  ] as const;

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden bg-ink text-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assets.hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-ink/40" />
        <div className="container relative py-24 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-gold">{t("kicker")}</p>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl text-sand md:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-sand/80">{t("lead")}</p>
        </div>
      </section>

      {/* mission / vision */}
      <section className="container grid gap-6 py-16 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="font-display text-2xl text-gold">{t("missionTitle")}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t("mission")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8">
          <h2 className="font-display text-2xl text-gold">{t("visionTitle")}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t("vision")}</p>
        </div>
      </section>

      {/* values */}
      <section className="border-y border-border bg-muted/30">
        <div className="container py-16">
          <h2 className="mb-10 text-center font-display text-3xl text-gold">{t("valuesTitle")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.t} className="rounded-lg border border-border bg-card p-6 text-center">
                <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15 text-gold-deep">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{t(v.t)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(v.d)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* sports */}
      <section className="container py-16">
        <h2 className="mb-10 text-center font-display text-3xl text-gold">{t("sportsTitle")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {sports.map((s) => (
            <div key={s.key} className="rounded-lg border border-border bg-card p-8 text-center">
              <s.icon className="mx-auto mb-4 h-10 w-10 text-nile" />
              <h3 className="text-lg font-semibold">{ts(s.key)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{ts(`${s.key}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="bg-gradient-to-r from-ink to-nile py-16 text-center text-sand">
        <div className="container">
          <h2 className="font-display text-3xl text-gold">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sand/85">{t("ctaSub")}</p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/register">{t("ctaTitle")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
