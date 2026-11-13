import type { Role } from "@/config/roles";

/** Roles allowed to create tournaments / events / courses / posts. */
export const CREATOR_ROLES: Role[] = ["super_admin", "admin", "judge", "coach"];

export const isAdminRole = (role?: Role | null) =>
  role === "super_admin" || role === "admin";

/** Content that its creator can edit / delete (PR-11). */
export type ContentType = "tournament" | "event" | "course" | "post";

/**
 * Who may edit / change status / delete a piece of content (PR-11, owner decision 13 Nov):
 *   super_admin / admin → everything
 *   anyone else         → only what they created themselves
 * (The old "judge manages coaches' content" rule was removed.)
 * Mirrors `can_manage_creator()` in the DB (migration 0039).
 */
export function canManageContent(
  me: { id: string; role: Role },
  creator: { id: string; role?: Role } | null | undefined,
): boolean {
  if (isAdminRole(me.role)) return true;
  return !!creator?.id && creator.id === me.id;
}
