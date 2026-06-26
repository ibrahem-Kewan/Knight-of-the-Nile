import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role, AccountStatus } from "@/config/roles";

export type Profile = {
  id: string;
  role: Role;
  status: AccountStatus;
  display_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  avatar_url: string | null;
  locale: string | null;
  email: string | null;
};

/** Current authenticated user's profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, role, status, display_name, first_name_ar, last_name_ar, avatar_url, locale, email",
    )
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
});

/** Require an authenticated, active user. Redirects otherwise. */
export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/pending");
  return profile;
}

/** Require one of the given roles. */
export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await requireAuth();
  if (!roles.includes(profile.role)) redirect("/");
  return profile;
}
