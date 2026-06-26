import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");

  const explore = [
    { href: "/tournaments", label: tn("tournaments") },
    { href: "/rankings", label: tn("rankings") },
    { href: "/courses", label: tn("courses") },
    { href: "/news", label: tn("news") },
  ] as const;

  const account = [
    { href: "/login", label: tn("login") },
    { href: "/register", label: tn("register") },
    { href: "/about", label: tn("about") },
  ] as const;

  return (
    <footer className="border-t border-border bg-card">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
            <span className="font-display text-lg text-gold">فارس النيل</span>
            <span className="text-sm text-muted-foreground">Knight of the Nile</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("tagline")}
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">{t("explore")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {explore.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-gold">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">{t("account")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {account.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-gold">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5">
        <p className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} فارس النيل — {t("rights")}
        </p>
      </div>
    </footer>
  );
}
