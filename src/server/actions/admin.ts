"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeErrorCode } from "@/lib/db/write-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import type { Role } from "@/config/roles";
import { isStaffRole, parseSpecialties, specialtyErrorCode } from "@/lib/staff/specialties";

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
  revalidatePath("/profile");
}

// ---- account approval (pending -> active) ----
export async function approveUser(userId: string): Promise<Res> {
  const admin = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "active", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: "errForbidden" };
  revalidate();
  return { ok: true };
}

export async function rejectUser(userId: string): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", userId);
  if (error) return { error: "errForbidden" };
  revalidate();
  return { ok: true };
}

// ---- status ----
export async function setUserStatus(userId: string, status: "active" | "suspended"): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const target = await loadTarget(userId);
  if (!target) return { error: "not-found" };
  if (target.role === PROTECTED) return { error: "super-protected" };
  if (target.role === "admin" && me.role !== "super_admin") return { error: "super-only" };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) return { error: "errForbidden" };
  revalidate();
  return { ok: true };
}

// ---- role change with protection ----
// coach / judge need 1+ specialties (PR-18): role + specialties are saved atomically by the
// assign_role_with_specialties RPC (0048). Athlete goes through the same RPC so the change is audited
// and the old role's specialties are removed. Admin promotion keeps the direct, separately guarded path (0030).
export async function setUserRole(userId: string, role: Role, specialties?: string[]): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const target = await loadTarget(userId);
  if (!target) return { error: "not-found" };

  // never touch a super admin
  if (target.role === PROTECTED || userId === me.id) return { error: "super-protected" };
  // assigning admin, or changing someone who is already admin => super only
  if ((role === "admin" || target.role === "admin") && me.role !== "super_admin") {
    return { error: "super-only" };
  }
  // no one can create another super_admin from UI
  if (role === "super_admin") return { error: "forbidden" };

  const supabase = await createClient();

  if (role === "admin") {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) return { error: "errForbidden" };
    revalidate();
    return { ok: true };
  }

  let list: string[] | null = null;
  if (isStaffRole(role)) {
    const parsed = parseSpecialties(specialties);
    if (!parsed.ok) return { error: parsed.error };
    list = parsed.value;
  }
  const { error } = await supabase.rpc("assign_role_with_specialties", {
    p_profile: userId,
    p_role: role,
    p_specialties: list,
  });
  if (error) return { error: specialtyErrorCode("admin.setUserRole", error) };
  revalidate();
  return { ok: true };
}

// ---- change the specialties of an existing coach / judge ----
export async function setUserSpecialties(userId: string, specialties: string[]): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const target = await loadTarget(userId);
  if (!target) return { error: "not-found" };
  if (userId === me.id) return { error: "super-protected" };
  if (!isStaffRole(target.role)) return { error: "invalid" };

  const parsed = parseSpecialties(specialties);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_staff_specialties", {
    p_profile: userId,
    p_role: target.role,
    p_specialties: parsed.value,
  });
  if (error) return { error: specialtyErrorCode("admin.setUserSpecialties", error) };
  revalidate();
  return { ok: true };
}

// ---- delete (hard) ----
export async function deleteUser(userId: string): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const target = await loadTarget(userId);
  if (!target) return { error: "not-found" };
  if (target.role === PROTECTED) return { error: "super-protected" }; // main admin can't be deleted
  if (target.role === "admin" && me.role !== "super_admin") return { error: "super-only" };
  if (userId === me.id) return { error: "self" };

  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId); // cascades to profiles (FK on delete cascade)
  } catch {
    // fallback: soft-deactivate if service role unavailable
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected", deleted_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return { error: "errForbidden" };
  }
  revalidate();
  return { ok: true };
}

// ---- role requests (coach/judge) ----
// The requester proposes specialties; the admin approves or adjusts them. Role, specialties and the
// request status change in one transaction (approve_role_request RPC, 0048) with an audit row.
export async function approveRoleRequest(reqId: string, specialties?: string[]): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  let list: string[] | null = null;
  if (specialties !== undefined) {
    const parsed = parseSpecialties(specialties);
    if (!parsed.ok) return { error: parsed.error };
    list = parsed.value;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_role_request", { p_request: reqId, p_specialties: list });
  if (error) return { error: specialtyErrorCode("admin.approveRoleRequest", error) };
  revalidate();
  return { ok: true };
}

export async function rejectRoleRequest(reqId: string): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const { data: upd, error } = await supabase
    .from("role_requests")
    .update({ status: "rejected", reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", reqId)
    .eq("status", "pending") // never overwrite an already approved/rejected request
    .select("id");
  if (error) return { error: writeErrorCode("admin.rejectRoleRequest", error) };
  if (!upd?.length) return { error: "invalid" };
  revalidate();
  return { ok: true };
}
