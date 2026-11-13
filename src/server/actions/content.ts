"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { CREATOR_ROLES, canManageContent } from "@/lib/auth/permissions";

type Res = { ok?: boolean; error?: string };

const POST_TYPES = ["post", "article", "announcement"];

/** Moderation (publish / reject) is an admin task — authors cannot self-publish (PR-11). */
export async function moderatePost(postId: string, action: "publish" | "reject"): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();

  const { data: post } = await supabase.from("posts").select("id, deleted_at").eq("id", postId).single();
  if (!post || (post as { deleted_at: string | null }).deleted_at) return { error: "not-found" };

  const patch =
    action === "publish"
      ? { status: "published", moderated_by: me.id, published_at: new Date().toISOString() }
      : { status: "rejected", moderated_by: me.id };
  await supabase.from("posts").update(patch).eq("id", postId);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { ok: true };
}

/** Author or admin edits a post's title / type (PR-11). Audited by a DB trigger (0039). */
export async function updatePost(postId: string, formData: FormData): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, author_id, deleted_at, deletion_requested_at")
    .eq("id", postId)
    .maybeSingle();
  const post = data as { author_id: string; deleted_at: string | null; deletion_requested_at: string | null } | null;
  if (!post || post.deleted_at || post.deletion_requested_at) return { error: "not-found" };
  if (!canManageContent(me, { id: post.author_id })) return { error: "forbidden" };

  const titleAr = String(formData.get("title_ar") || "").trim();
  const titleEn = String(formData.get("title_en") || "").trim();
  const type = String(formData.get("type") || "post");
  if (!titleAr) return { error: "missing" };
  if (!POST_TYPES.includes(type)) return { error: "invalid" };

  const { data: upd, error } = await supabase
    .from("posts")
    .update({ title_ar: titleAr, title_en: titleEn || null, type })
    .eq("id", postId)
    .select("id");
  if (error) { console.error("[posts]", error.message); return { error: "failed" }; }
  if (!upd?.length) return { error: "forbidden" };
  revalidatePath("/admin/news");
  revalidatePath("/coach/posts");
  revalidatePath("/news");
  return { ok: true };
}
