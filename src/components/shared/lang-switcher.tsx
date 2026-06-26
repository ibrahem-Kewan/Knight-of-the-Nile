"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { Languages } from "lucide-react";

export function LangSwitcher() {
  const locale = useLocale();
  const t = useTranslations("lang");
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      aria-label={t("switch")}
      onClick={() => router.replace(pathname, { locale: next })}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
    >
      <Languages className="h-4 w-4" />
      {t(next)}
    </button>
  );
}
