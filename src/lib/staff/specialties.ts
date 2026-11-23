import { z } from "zod";

/** Coach / judge specialties (PR-18). Stored values; labels live under `enums.specialtyCoach|specialtyJudge`. */
export const STAFF_SPECIALTIES = [
  "ground_archery",
  "mounted_archery",
  "equestrian",
  "equestrian_mounted",
  "all",
] as const;
export type StaffSpecialty = (typeof STAFF_SPECIALTIES)[number];

export type StaffRole = "coach" | "judge";
export const isStaffRole = (r: string | null | undefined): r is StaffRole => r === "coach" || r === "judge";

/** `enums` label group for a role's specialties. */
export const specialtyGroup = (role: StaffRole) => (role === "coach" ? "specialtyCoach" : "specialtyJudge");

/** 1+ distinct allowed values; "all" is exclusive. Mirrors public.valid_specialties() in migration 0048. */
export const specialtiesSchema = z
  .array(z.enum(STAFF_SPECIALTIES))
  .min(1)
  .refine((a) => new Set(a).size === a.length)
  .refine((a) => !a.includes("all") || a.length === 1);

export type ParsedSpecialties =
  | { ok: true; value: StaffSpecialty[] }
  | { ok: false; error: "errSpecialtyRequired" | "errSpecialtyInvalid" };

export function parseSpecialties(input: unknown): ParsedSpecialties {
  if (input == null || (Array.isArray(input) && input.length === 0)) return { ok: false, error: "errSpecialtyRequired" };
  const r = specialtiesSchema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: "errSpecialtyInvalid" };
}

/** Sort stored specialties into the canonical display order. */
export function sortSpecialties(list: readonly string[]): StaffSpecialty[] {
  return STAFF_SPECIALTIES.filter((s) => list.includes(s));
}

/**
 * Maps an RPC/DB error from migration 0048 to a translated UI code (`errors.*`) and logs the real cause.
 * Never return `error.message` to the UI.
 */
export function specialtyErrorCode(where: string, e: { code?: string; message?: string; details?: string | null; hint?: string | null }): string {
  const msg = e.message ?? "";
  if (msg.includes("specialty_required")) return "errSpecialtyRequired";
  if (msg.includes("specialty_invalid") || msg.includes("specialty_all_exclusive") || msg.includes("role_requests_specialties_check")) {
    return "errSpecialtyInvalid";
  }
  if (msg.includes("super_protected")) return "super-protected";
  if (msg.includes("super_only") || msg.includes("profile_admin_super_only")) return "super-only";
  if (msg.includes("not_found")) return "not-found";
  if (msg.includes("role_mismatch") || msg.includes("invalid")) return "invalid";
  console.error(`[${where}] rpc failed`, { code: e.code, message: e.message, details: e.details, hint: e.hint });
  if (e.code === "PGRST202" || e.code === "42883" || e.code === "42703" || e.code === "42P01") return "errDbOutdated"; // 0048 not applied yet
  if (e.code === "42501") return "forbidden";
  return "failed";
}
