import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { assets } from "@/config/assets";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LangSwitcher } from "@/components/shared/lang-switcher";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const t = useTranslations("nav");
  const links = [
    { href: "/tournaments", label: t("tournaments") },
    { href: "/rankings", label: t("rankings") },
    { href: "/courses", label: t("courses") },
    { href: "/news", label: t("news") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg text-gold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assets.logo} alt="فارس النيل" className="h-9 w-9 rounded-full object-cover ring-1 ring-gold/40" />
          <span>فارس النيل</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-foreground/80 transition-colors hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/login">{t("login")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
