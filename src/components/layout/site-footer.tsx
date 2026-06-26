import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("common");
  return (
    <footer className="border-t border-border bg-card">
      <div className="container flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted-foreground md:flex-row">
        <p className="font-display text-gold">{t("appName")} — Knight of the Nile</p>
        <p>© {new Date().getFullYear()} — جميع الحقوق محفوظة</p>
      </div>
    </footer>
  );
}
