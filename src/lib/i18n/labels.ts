// Turns raw DB values (enum codes, currency codes, action error codes) into
// translated labels so no English code ever leaks into the UI.
// Works with both `useTranslations` (client) and `getTranslations` (server).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translator = ((key: any, values?: any) => string) & { has: (key: any) => boolean };

/** Label for a DB enum value, e.g. enumLabel(te, "status", "pending") → "قيد الانتظار". */
export function enumLabel(t: Translator, group: string, value: string | null | undefined): string {
  if (!value) return "—";
  const key = `${group}.${value}`;
  return t.has(key) ? t(key) : value;
}

/** "150 ج.م" / "150 EGP" — t must be the "enums" translator. */
export function money(t: Translator, amount: number | string | null | undefined, currency: string | null | undefined): string {
  return `${Number(amount ?? 0)} ${enumLabel(t, "currency", currency ?? "EGP")}`;
}

/** Message for a server-action error code — t must be the "errors" translator. */
export function errorLabel(t: Translator, code: string | null | undefined): string {
  return code && t.has(code) ? t(code) : t("generic");
}
