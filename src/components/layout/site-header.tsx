import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { assets } from "@/config/assets";
import { getProfile } from "@/lib/auth/session";
import { roleHome } from "@/config/roles";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LangSwitcher } from "@/components/shared/lang-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { SiteMobileMenu } from "@/components/layout/site-mobile-menu";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const locale = await getLocale();
  const brandName = locale === "en" ? siteConfig.nameEn : siteConfig.name;
  const profile = await getProfile();
  const links = [
    { href: "/tournaments", label: t("tournaments") },
    { href: "/events", label: t("events") },
    { href: "/rankings", label: t("rankings") },
    { href: "/courses", label: t("courses") },
    { href: "/news", label: t("news") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 font-display text-lg text-gold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assets.logo} alt={brandName} width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-gold/40" />
          <span className="truncate">{brandName}</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-foreground/80 transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LangSwitcher />
          <ThemeToggle />
          {profile && profile.status === "active" ? (
            <UserMenu
              name={profile.display_name ?? profile.first_name_ar ?? "..."}
              dashboardHref={roleHome[profile.role] ?? "/"}
            />
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{t("login")}</Link>
            </Button>
          )}
          <SiteMobileMenu links={links.map((l) => ({ href: l.href, label: l.label }))} />
        </div>
      </div>
    </header>
  );
}
