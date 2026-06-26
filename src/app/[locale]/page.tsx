import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Target, Crosshair, Award } from "lucide-react";

export default function HomePage() {
  const t = useTranslations("home");

  const sports = [
    { icon: Target, key: "archery", ar: "الرماية", en: "Archery" },
    { icon: Crosshair, key: "hba", ar: "الرماية من على الخيل", en: "Horseback Archery" },
    { icon: Award, key: "equestrian", ar: "الفروسية", en: "Equestrian" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-ink to-ink-700 text-sand">
        <div className="container flex flex-col items-center gap-6 py-24 text-center">
          <h1 className="font-display text-4xl font-extrabold text-gold md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-2xl text-lg text-sand/90">{t("heroSubtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-gold-deep"
            >
              {t("ctaJoin")}
            </Link>
            <Link
              href="/tournaments"
              className="inline-flex h-11 items-center rounded-md border border-gold/60 px-6 font-semibold text-gold hover:bg-gold/10"
            >
              {t("ctaExplore")}
            </Link>
          </div>
        </div>
      </section>

      {/* Sports */}
      <section className="container py-16">
        <h2 className="mb-8 text-center font-display text-3xl text-gold">{t("sports")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {sports.map((s) => (
            <div
              key={s.key}
              className="group rounded-lg border border-border bg-card p-8 text-center transition-colors hover:border-gold"
            >
              <s.icon className="mx-auto mb-4 h-10 w-10 text-nile group-hover:text-gold" />
              <h3 className="text-lg font-semibold">{s.ar}</h3>
              <p className="text-sm text-muted-foreground">{s.en}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
