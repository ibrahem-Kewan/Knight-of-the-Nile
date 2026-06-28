"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import type { Role } from "@/config/roles";

type Res = { ok?: boolean; error?: string };

const PROTECTED: Role = "super_admin";

async function loadTarget(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, role, status").eq("id", id).single();
  return data as { id: string; role: Role; status: string } | null;
}

function revalidate() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/role-requests");
}

// ---- account approval (pending -> active) ----
export async function approveUser(userId: string): Promise<Res> {
  const admin = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ status: "active", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", userId);
  revalidate();
  return { ok: true };
}

export async function rejectUser(userId: string): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  await supabase.from("profiles").update({ status: "rejected" }).eq("id", userId);
  revalidate();
  return { ok: true };
}

// ---- status ----
export async function setUserStatus(userId: string, status: "active" | "suspended"): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const target = await loadTarget(userId);
  if (!target) return { error: "not found" };
  if (target.role === PROTECTED) return { error: "super-protected" };
  if (target.role === "admin" && me.role !== "super_admin") return { error: "super-only" };
  const supabase = await createClient();
  await supabase.from("profiles").update({ status }).eq("id", userId);
  revalidate();
  return { ok: true };
}

// ---- role change with protection ----
export async function setUserRole(userId: string, role: Role): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const target = await loadTarget(userId);
  if (!target) return { error: "not found" };

  // never touch a super admin
  if (target.role === PROTECTED || userId === me.id) return { error: "super-protected" };
  // assigning admin, or changing someone who is already admin => super only
  if ((role === "admin" || target.role === "admin") && me.role !== "super_admin") {
    return { error: "super-only" };
  }
  // no one can create another super_admin from UI
  if (role === "super_admin") return { error: "forbidden" };

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidate();
  return { ok: true };
}

// ---- delete (hard) ----
export async function deleteUser(userId: string): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const target = await loadTarget(userId);
  if (!target) return { error: "not found" };
  if (target.role === PROTECTED) return { error: "super-protected" }; // main admin can't be deleted
  if (target.role === "admin" && me.role !== "super_admin") return { error: "super-only" };
  if (userId === me.id) return { error: "self" };

  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId); // cascades to profiles (FK on delete cascade)
  } catch {
    // fallback: soft-deactivate if service role unavailable
    const supabase = await createClient();
    await supabase.from("profiles").update({ status: "rejected", deleted_at: new Date().toISOString() }).eq("id", userId);
  }
  revalidate();
  return { ok: true };
}

// ---- role requests (coach/judge) ----
export async function approveRoleRequest(reqId: string): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("role_requests")
    .select("id, profile_id, requested_role, status")
    .eq("id", reqId)
    .single();
  if (!req || (req as { status: string }).status !== "pending") return { error: "invalid" };
  const r = req as { profile_id: string; requested_role: Role };
  if (r.requested_role === "admin" || r.requested_role === "super_admin") return { error: "forbidden" };

  await supabase.from("profiles").update({ role: r.requested_role }).eq("id", r.profile_id);
  await supabase
    .from("role_requests")
    .update({ status: "approved", reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", reqId);
  revalidate();
  return { ok: true };
}

export async function rejectRoleRequest(reqId: string): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  await supabase
    .from("role_requests")
    .update({ status: "rejected", reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", reqId);
  revalidate();
  return { ok: true };
}
