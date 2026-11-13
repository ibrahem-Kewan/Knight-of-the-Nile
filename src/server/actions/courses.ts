"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { CREATOR_ROLES, canManageContent } from "@/lib/auth/permissions";

type Res = { ok?: boolean; error?: string };

function slugify(s: string) {
  const base = s.toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "course") + "-" + Math.random().toString(36).slice(2, 6);
}

export async function createCourse(formData: FormData): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const supabase = await createClient();

  const titleAr = String(formData.get("title_ar") || "").trim();
  const titleEn = String(formData.get("title_en") || "").trim();
  if (!titleAr) return { error: "missing" };

  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : null;
  };
  const str = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v || null;
  };
  const descAr = str("description");

  const { error } = await supabase.from("courses").insert({
    owner_id: me.id,
    title_ar: titleAr,
    title_en: titleEn || null,
    slug: slugify(titleEn || titleAr),
    description: descAr ? { ar: descAr } : null,
    sport_id: str("sport_id"),
    level: str("level"),
    price: num("price") ?? 0,
    certificate_enabled: String(formData.get("certificate_enabled") || "") === "on",
    status: "draft",
  });
  if (error) { console.error("[courses]", error.message); return { error: "failed" }; }

  revalidatePath("/coach/courses");
  revalidatePath("/admin/courses");
  return { ok: true };
}

/** Course + owner for permission checks; null when missing, deleted or pending deletion. */
async function loadCtx(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, owner_id, description, deleted_at, deletion_requested_at")
    .eq("id", id)
    .maybeSingle();
  const c = data as {
    id: string; owner_id: string; description: Record<string, string> | null;
    deleted_at: string | null; deletion_requested_at: string | null;
  } | null;
  if (!c || c.deleted_at || c.deletion_requested_at) return null;
  return c;
}

function revalidateCourses() {
  revalidatePath("/coach/courses");
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/coach");
}

/** Owner or admin edits a course (PR-11). Audited by a DB trigger (0039). */
export async function updateCourse(id: string, formData: FormData): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const ctx = await loadCtx(id);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, { id: ctx.owner_id })) return { error: "forbidden" };

  const titleAr = String(formData.get("title_ar") || "").trim();
  const titleEn = String(formData.get("title_en") || "").trim();
  if (!titleAr) return { error: "missing" };
  const str = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v || null;
  };
  const price = formData.get("price") ? Number(formData.get("price")) : 0;
  if (price < 0) return { error: "invalid" };
  const descAr = str("description");
  // Keep any other-language description that may exist.
  const description = { ...(ctx.description ?? {}), ar: descAr ?? "" };

  const supabase = await createClient();
  const { data: upd, error } = await supabase
    .from("courses")
    .update({
      title_ar: titleAr,
      title_en: titleEn || null,
      description,
      sport_id: str("sport_id"),
      level: str("level"),
      price,
      certificate_enabled: String(formData.get("certificate_enabled") || "") === "on",
    })
    .eq("id", id)
    .select("id");
  if (error) { console.error("[courses]", error.message); return { error: "failed" }; }
  if (!upd?.length) return { error: "forbidden" };
  revalidateCourses();
  return { ok: true };
}

export async function setCourseStatus(id: string, status: string): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  if (!["draft", "published", "archived"].includes(status)) return { error: "invalid" };
  // Ownership check in the app (closes risk §7 #9) + RLS courses_write_own in the DB.
  const ctx = await loadCtx(id);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, { id: ctx.owner_id })) return { error: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ status }).eq("id", id);
  if (error) { console.error("[courses]", error.message); return { error: "failed" }; }
  revalidateCourses();
  return { ok: true };
}
