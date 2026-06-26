export const ROLES = ["super_admin", "admin", "coach", "judge", "athlete"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = [
  "pending_approval",
  "active",
  "suspended",
  "rejected",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Dashboard base path per role. */
export const roleHome: Record<Role, string> = {
  super_admin: "/admin",
  admin: "/admin",
  coach: "/coach",
  judge: "/judge",
  athlete: "/athlete",
};

export const isAdmin = (role?: Role | null) =>
  role === "super_admin" || role === "admin";
