"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { CREATOR_ROLES, canManageContent, isAdminRole, type ContentType } from "@/lib/auth/permissions";

type Res = { ok?: boolean; error?: string };

const TABLE: Record<ContentType, { table: string; owner: string }> = {
  tournament: { table: "tournaments", owner: "created_by" },
  event: { table: "events", owner: "created_by" },
  course: { table: "courses", owner: "owner_id" },
  post: { table: "posts", owner: "author_id" },
};

const PATHS: Record<ContentType, string[]> = {
  tournament: ["/admin/tournaments", "/coach/tournaments", "/judge/tournaments", "/tournaments", "/coach/register", "/"],
  event: ["/admin/events", "/coach/events", "/judge/events", "/events"],
  course: ["/admin/courses", "/coach/courses", "/courses", "/coach"],
  post: ["/admin/news", "/coach/posts", "/news"],
};

function isType(t: string): t is ContentType {
  return t in TABLE;
}

function revalidateType(type: ContentType) {
  for (const p of PATHS[type]) revalidatePath(p);
  revalidatePath("/admin/deletion-requests");
  revalidatePath("/admin");
}

/** App-side ownership check (DB re-checks it in RLS / the RPC). */
async function loadOwned(type: ContentType, id: string) {
  const me = await requireRole(CREATOR_ROLES);
  const supabase = await createClient();
  const { table, owner } = TABLE[type];
  const { data } = await supabase.from(table).select(`id, ${owner}, deleted_at`).eq("id", id).maybeSingle();
  const row = data as Record<string, string | null> | null;
  if (!row || row.deleted_at) return { me, supabase, error: "not-found" as const };
  if (!canManageContent(me, { id: row[owner] ?? "" })) return { me, supabase, error: "forbidden" as const };
  return { me, supabase, error: null };
}

function rpcError(code?: string, message?: string): string {
  if (code === "42501") return "forbidden";
  if (code === "P0002") return "not-found";
  if (message) console.error("[content-manage]", message);
  return "failed";
}

/** Shown before deleting: how many registrations/payments exist, and whether admin approval is needed. */
export async function getDeletionImpact(
  type: string,
  id: string,
): Promise<{ ok?: boolean; error?: string; count?: number; needsApproval?: boolean }> {
  if (!isType(type)) return { error: "invalid" };
  const ctx = await loadOwned(type, id);
  if (ctx.error) return { error: ctx.error };
  const { data, error } = await ctx.supabase.rpc("content_delete_impact", { p_type: type, p_id: id });
  if (error) return { error: rpcError(error.code, error.message) };
  const count = Number(data ?? 0);
  return { ok: true, count, needsApproval: count > 0 && !isAdminRole(ctx.me.role) };
}

/** Soft-delete (or send to admin for approval when there are registrations/payments). */
export async function deleteContent(
  type: string,
  id: string,
  reason?: string,
): Promise<Res & { result?: "deleted" | "requested" }> {
  if (!isType(type)) return { error: "invalid" };
  const ctx = await loadOwned(type, id);
  if (ctx.error) return { error: ctx.error };
  const { data, error } = await ctx.supabase.rpc("request_content_delete", {
    p_type: type,
    p_id: id,
    p_reason: reason?.trim().slice(0, 500) || null,
  });
  if (error) return { error: rpcError(error.code, error.message) };
  revalidateType(type);
  return { ok: true, result: data === "requested" ? "requested" : "deleted" };
}

/** Admin approves (soft delete) or rejects (item returns unchanged) a pending deletion request. */
export async function resolveDeletionRequest(requestId: string, approve: boolean, note?: string): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("content_deletion_requests")
    .select("entity_type")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { error: "not-found" };
  const { error } = await supabase.rpc("resolve_content_delete_request", {
    p_request: requestId,
    p_approve: approve,
    p_note: note?.trim().slice(0, 500) || null,
  });
  if (error) return { error: rpcError(error.code, error.message) };
  const type = (req as { entity_type: string }).entity_type;
  if (isType(type)) revalidateType(type);
  return { ok: true };
}
