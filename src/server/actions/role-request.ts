"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

export async function requestRoleUpgrade(role: "coach" | "judge", note?: string): Promise<Res> {
  const me = await requireAuth();
  if (me.role !== "athlete") return { error: "already" };

  const supabase = await createClient();
  // avoid duplicate pending request
  const { data: existing } = await supabase
    .from("role_requests")
    .select("id")
    .eq("profile_id", me.id)
    .eq("status", "pending")
    .limit(1);
  if (existing && existing.length) return { error: "pending-exists" };

  const { error } = await supabase
    .from("role_requests")
    .insert({ profile_id: me.id, requested_role: role, note: note || null });
  if (error) return { error: "failed" };

  revalidatePath("/athlete/request-role");
  return { ok: true };
}
