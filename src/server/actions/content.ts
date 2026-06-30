"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

export async function moderatePost(postId: string, action: "publish" | "reject"): Promise<Res> {
  const me = await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const patch =
    action === "publish"
      ? { status: "published", moderated_by: me.id, published_at: new Date().toISOString() }
      : { status: "rejected", moderated_by: me.id };
  await supabase.from("posts").update(patch).eq("id", postId);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { ok: true };
}
