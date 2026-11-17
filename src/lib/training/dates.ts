// Cairo-day date helpers for training memberships (PR-15). Plain module: usable from server and client code.

export const START_BACK_DAYS = 30;
export const START_AHEAD_DAYS = 90;
export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(s: string): boolean {
  if (typeof s !== "string" || !YMD_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const cairoFmt = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" });

export function cairoToday(): string {
  return cairoFmt().format(new Date());
}

export function cairoDateOf(iso: string): string {
  return cairoFmt().format(new Date(iso));
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
}

export function formatYmd(ymd: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );
}

/** Bounds for <input type="date">; the server re-checks. */
export function startBounds(
  today: string,
  groupStartsOn: string | null,
  current?: string | null,
): { min: string; max: string } {
  const back = addDays(today, -START_BACK_DAYS);
  const floor = current && current < back ? current : back;
  const min = groupStartsOn && groupStartsOn > floor ? groupStartsOn : floor;
  const ahead = addDays(today, START_AHEAD_DAYS);
  return { min, max: groupStartsOn && groupStartsOn > ahead ? groupStartsOn : ahead };
}
