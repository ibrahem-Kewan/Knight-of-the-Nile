import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
export const rtlLocales: Locale[] = ["ar"];
export const dirFor = (locale: string) =>
  rtlLocales.includes(locale as Locale) ? "rtl" : "ltr";
