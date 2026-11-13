import { routing, type Locale } from "@/lib/i18n/routing";

/** Short-lived httpOnly cookie set only after a valid recovery link; gates /reset-password. */
export const RECOVERY_COOKIE = "kotn_pw_recovery";
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60; // seconds

/** Route handler that verifies the e-mailed link (outside [locale]; /api is skipped by the intl middleware). */
export const RESET_CONFIRM_PATH = "/api/auth/confirm";

export const PASSWORD_MIN = 8;

export function safeLocale(value: unknown): Locale {
  return routing.locales.includes(value as Locale) ? (value as Locale) : routing.defaultLocale;
}

/** "/login" for the default locale (localePrefix: as-needed), "/en/login" otherwise. */
export function localePath(locale: Locale, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}
