"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { CREATOR_ROLES } from "@/lib/auth/permissions";

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
  if (error) return { error: error.message };

  revalidatePath("/coach/courses");
  revalidatePath("/admin/courses");
  return { ok: true };
}

export async function setCourseStatus(id: string, status: string): Promise<Res> {
  await requireRole(CREATOR_ROLES);
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/coach/courses");
  revalidatePath("/courses");
  return { ok: true };
}
