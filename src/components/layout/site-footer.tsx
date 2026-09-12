import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { siteConfig } from "@/config/site";
import { getProfile } from "@/lib/auth/session";
import { roleHome } from "@/config/roles";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const locale = await getLocale();
  const brandName = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  const profile = await getProfile();
  const isLoggedIn = Boolean(profile && profile.status === "active");

  const explore = [
    { href: "/tournaments", label: tn("tournaments") },
    { href: "/rankings", label: tn("rankings") },
    { href: "/courses", label: tn("courses") },
    { href: "/news", label: tn("news") },
  ] as const;

  const account = isLoggedIn
    ? ([
        { href: (profile ? roleHome[profile.role] : "/") ?? "/", label: tn("dashboard") },
        { href: "/profile", label: tn("profile") },
        { href: "/about", label: tn("about") },
        { href: "/contact", label: tn("contact") },
      ] as const)
    : ([
        { href: "/login", label: tn("login") },
        { href: "/register", label: tn("register") },
        { href: "/about", label: tn("about") },
        { href: "/contact", label: tn("contact") },
      ] as const);

  return (
    <footer className="border-t border-border bg-card">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
            <span className="font-display text-lg text-gold">{brandName}</span>
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
          © {new Date().getFullYear()} {brandName} — {t("rights")}
        </p>
      </div>
    </footer>
  );
}
