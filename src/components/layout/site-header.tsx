import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LangSwitcher } from "@/components/shared/lang-switcher";

export function SiteHeader() {
  const t = useTranslations("nav");
  const links = [
    { href: "/tournaments", label: t("tournaments") },
    { href: "/rankings", label: t("rankings") },
    { href: "/courses", label: t("courses") },
    { href: "/news", label: t("news") },
    { href: "/about", label: t("about") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg text-gold">
          <span className="inline-block h-8 w-8 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
          {t("home") /* placeholder logo */}
          <span className="sr-only">فارس النيل</span>
          <span className="font-display">فارس النيل</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-gold"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-gold-deep"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </header>
  );
}
