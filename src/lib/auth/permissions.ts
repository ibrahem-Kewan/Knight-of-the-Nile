import type { Role } from "@/config/roles";

/** Roles allowed to create tournaments / events / courses / posts. */
export const CREATOR_ROLES: Role[] = ["super_admin", "admin", "judge", "coach"];

export const isAdminRole = (role?: Role | null) =>
  role === "super_admin" || role === "admin";

/**
 * Hierarchy for managing OTHER people's content (tournaments, events, posts…):
 *   super_admin / admin → manage everything
 *   judge              → manage own + coaches' content (not admins/other judges)
 *   coach              → manage own content only
 * `me` always manages their own content.
 */
export function canManageContent(
  me: { id: string; role: Role },
  creator: { id: string; role: Role } | null | undefined,
): boolean {
  if (isAdminRole(me.role)) return true;
  if (creator && creator.id === me.id) return true;
  if (me.role === "judge" && creator?.role === "coach") return true;
  return false;
}
