"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { CREATOR_ROLES, canManageContent } from "@/lib/auth/permissions";
import type { Role } from "@/config/roles";

type Res = { ok?: boolean; error?: string };

export async function moderatePost(postId: string, action: "publish" | "reject"): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const supabase = await createClient();

  // Resolve the post author's role to apply the management hierarchy.
  const { data: post } = await supabase.from("posts").select("id, author_id").eq("id", postId).single();
  if (!post) return { error: "not-found" };
  const authorId = (post as { author_id: string | null }).author_id;
  let authorRole: Role = "coach";
  if (authorId) {
    const { data: a } = await supabase.from("profiles").select("role").eq("id", authorId).single();
    authorRole = ((a as { role: Role } | null)?.role ?? "coach") as Role;
  }
  if (!canManageContent(me, { id: authorId ?? "", role: authorRole })) return { error: "forbidden" };

  const patch =
    action === "publish"
      ? { status: "published", moderated_by: me.id, published_at: new Date().toISOString() }
      : { status: "rejected", moderated_by: me.id };
  await supabase.from("posts").update(patch).eq("id", postId);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { ok: true };
}
