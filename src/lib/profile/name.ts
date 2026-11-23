type NameParts = {
  display_name?: string | null;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  first_name_en?: string | null;
  last_name_en?: string | null;
};

const join = (a?: string | null, b?: string | null) => [a, b].map((s) => s?.trim()).filter(Boolean).join(" ");

/** Columns needed by `profileName` — keep selects in sync with it. */
export const PROFILE_NAME_COLUMNS = "display_name, first_name_ar, last_name_ar, first_name_en, last_name_en";

/**
 * One display name for a profile: display_name, else the Arabic name, else the English name.
 * Needed because many users (coaches especially) only have an English name, which used to render as "—".
 * Returns "" when nothing is set so callers can choose their own placeholder.
 */
export function profileName(p: NameParts | null | undefined): string {
  if (!p) return "";
  return p.display_name?.trim() || join(p.first_name_ar, p.last_name_ar) || join(p.first_name_en, p.last_name_en) || "";
}
