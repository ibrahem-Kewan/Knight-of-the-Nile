const TZ = "Africa/Cairo";

/** Weekday numbers use Postgres extract(dow): 0 = Sunday ... 6 = Saturday. */
export const WEEKDAYS_SUN_FIRST = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAYS_SAT_FIRST = [6, 0, 1, 2, 3, 4, 5] as const;

export const weekdayOrder = (locale: string): readonly number[] =>
  locale === "ar" ? WEEKDAYS_SAT_FIRST : WEEKDAYS_SUN_FIRST;

const intlLocale = (locale: string) => (locale === "ar" ? "ar-EG" : "en-GB");

// 2024-01-07 is a Sunday; add n days (UTC noon) to get weekday n in Cairo regardless of host zone.
const weekdayName = (n: number, locale: string, width: "long" | "short" = "long") =>
  new Intl.DateTimeFormat(intlLocale(locale), { weekday: width, timeZone: TZ }).format(
    new Date(Date.UTC(2024, 0, 7 + n, 12)),
  );

/** "HH:MM" (Cairo wall time) -> localized time, e.g. "6:30 م" / "18:30". */
export function formatTime(hhmm: string, locale: string): string {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: locale === "ar" ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12: locale === "ar",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1, h, m)));
}

/** e.g. "الجمعة 6:30 م" or "Fri, Sun 18:30". Duration is shown separately by the caller. */
export function formatSchedule(weekdays: number[], startTime: string, _duration: number, locale: string): string {
  const order = weekdayOrder(locale);
  const days = order.filter((d) => weekdays.includes(d)).map((d) => weekdayName(d, locale, weekdays.length > 2 ? "short" : "long"));
  const sep = locale === "ar" ? "، " : ", ";
  return `${days.join(sep)} ${formatTime(startTime, locale)}`;
}

export function formatMoney(amount: number | string, currency: string, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: currency.trim() || "EGP" }).format(
    Number(amount),
  );
}

export const shortWeekdayName = (n: number, locale: string) => weekdayName(n, locale, "short");
