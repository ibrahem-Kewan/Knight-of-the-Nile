"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

export async function approveUser(userId: string) {
  const admin = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ status: "active", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", userId);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/users");
}

export async function rejectUser(userId: string) {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  await supabase.from("profiles").update({ status: "rejected" }).eq("id", userId);
  revalidatePath("/admin/approvals");
}
