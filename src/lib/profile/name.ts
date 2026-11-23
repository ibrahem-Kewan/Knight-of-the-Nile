type NameParts = {
  display_name?: string | null;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  first_name_en?: string | null;
  last_name_en?: string | null;
  email?: string | null;
};

const join = (a?: string | null, b?: string | null) => [a, b].map((s) => s?.trim()).filter(Boolean).join(" ");

/** Columns needed by `profileName` — keep selects in sync with it. */
export const PROFILE_NAME_COLUMNS = "display_name, first_name_ar, last_name_ar, first_name_en, last_name_en";

/** True when the profile has a real name (display, Arabic or English). Email does not count. */
export function hasProfileName(p: NameParts | null | undefined): boolean {
  return profileName(p) !== "";
}

/**
 * One display name for a profile: display_name, else the Arabic name, else the English name.
 * With `emailFallback`, a nameless profile shows the part of its email before "@" — accounts created
 * before migration 0046 lost the name typed at sign-up, and until the owner completes it (the dashboard
 * forces this) pickers would otherwise show "—". Returns "" when nothing is available.
 */
export function profileName(p: NameParts | null | undefined, opts?: { emailFallback?: boolean }): string {
  if (!p) return "";
  const name = p.display_name?.trim() || join(p.first_name_ar, p.last_name_ar) || join(p.first_name_en, p.last_name_en);
  if (name) return name;
  if (opts?.emailFallback && p.email) return p.email.split("@")[0]?.trim() ?? "";
  return "";
}
