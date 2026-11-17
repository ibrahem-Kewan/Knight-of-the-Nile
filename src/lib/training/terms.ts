// Per-member subscription terms helpers (PR-16). Plain module: usable from server and client code.

export const PRICE_MODES = ["group", "fixed", "percent", "amount"] as const;
export type PriceMode = (typeof PRICE_MODES)[number];

export const TERMS_LIMITS = {
  fixedMax: 100000,
  discountPercentMax: 100,
  increasePercentMax: 200,
  amountMax: 100000,
  sessionsMin: 1,
  sessionsMax: 31,
} as const;

export type MemberTerms = { mode: PriceMode; value: number | null; sessions: number | null };

/** Mirrors member_terms_calc in the DB. For PREVIEW only; the DB is the authority. */
export function effectiveFee(groupFee: number, mode: PriceMode, value: number | null): number {
  const round = (x: number) => Math.round(x * 100) / 100;
  if (mode === "fixed") return Math.max(round(value ?? 0), 0);
  if (mode === "percent") return Math.max(round((groupFee * (100 + (value ?? 0))) / 100), 0);
  if (mode === "amount") return Math.max(round(groupFee + (value ?? 0)), 0);
  return groupFee;
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export function normalizeNumber(v: string): string {
  return v
    .trim()
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[٫,]/g, ".");
}

const VALUE_RE = /^\d{1,6}(\.\d{1,2})?$/;

export function parseTermsForm(fd: FormData): { input: MemberTerms & { reason: string } } | { error: string } {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const mode = get("price_mode");
  if (!(PRICE_MODES as readonly string[]).includes(mode)) return { error: "errTermsInvalid" };
  const m = mode as PriceMode;

  let value: number | null = null;
  if (m !== "group") {
    const raw = normalizeNumber(get("value"));
    if (!VALUE_RE.test(raw)) return { error: "errTermsInvalid" };
    const v = Number(raw);
    if (m === "fixed") {
      if (v < 0 || v > TERMS_LIMITS.fixedMax) return { error: "errTermsRange" };
      value = v;
    } else {
      const dir = get("direction");
      if (dir !== "discount" && dir !== "increase") return { error: "errTermsInvalid" };
      if (v <= 0) return { error: "errTermsRange" };
      const max =
        m === "percent"
          ? dir === "discount"
            ? TERMS_LIMITS.discountPercentMax
            : TERMS_LIMITS.increasePercentMax
          : TERMS_LIMITS.amountMax;
      if (v > max) return { error: "errTermsRange" };
      value = dir === "discount" ? -v : v;
    }
  }

  let sessions: number | null = null;
  const sRaw = normalizeNumber(get("sessions"));
  if (sRaw !== "") {
    if (!/^\d{1,2}$/.test(sRaw)) return { error: "errSessions" };
    const n = Number(sRaw);
    if (n < TERMS_LIMITS.sessionsMin || n > TERMS_LIMITS.sessionsMax) return { error: "errSessions" };
    sessions = n;
  }

  const reason = get("reason");
  if (reason.length < 3 || reason.length > 300) return { error: "errReasonRequired" };

  return { input: { mode: m, value, sessions, reason } };
}
