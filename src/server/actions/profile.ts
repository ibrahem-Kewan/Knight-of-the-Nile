"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) || "").trim();
  return v || null;
};

export async function updateMyProfile(formData: FormData): Promise<Res> {
  const me = await requireAuth();
  const supabase = await createClient();

  const firstAr = str(formData, "first_name_ar");
  const lastAr = str(formData, "last_name_ar");
  const firstEn = str(formData, "first_name_en");
  const lastEn = str(formData, "last_name_en");
  const display =
    str(formData, "display_name") ||
    [firstAr, lastAr].filter(Boolean).join(" ") ||
    [firstEn, lastEn].filter(Boolean).join(" ") ||
    null;

  const social = {
    instagram: str(formData, "instagram") ?? "",
    facebook: str(formData, "facebook") ?? "",
    x: str(formData, "x") ?? "",
    whatsapp: str(formData, "whatsapp") ?? "",
    youtube: str(formData, "youtube") ?? "",
  };
  const bioText = str(formData, "bio");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name_ar: firstAr,
      last_name_ar: lastAr,
      first_name_en: firstEn,
      last_name_en: lastEn,
      display_name: display,
      phone: str(formData, "phone"),
      avatar_url: str(formData, "avatar_url"),
      bio: bioText ? { ar: bioText } : null,
      social,
    })
    .eq("id", me.id);
  if (error) return { error: error.message };

  // Optional login-email change (triggers Supabase confirmation email).
  const email = str(formData, "email");
  if (email && email !== me.email) {
    const { error: authErr } = await supabase.auth.updateUser({ email });
    if (authErr) return { error: authErr.message };
    await supabase.from("profiles").update({ email }).eq("id", me.id);
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function changeMyPassword(formData: FormData): Promise<Res> {
  await requireAuth();
  const pw = String(formData.get("new_password") || "");
  const confirm = String(formData.get("confirm_password") || "");
  if (pw.length < 8) return { error: "short" };
  if (pw !== confirm) return { error: "mismatch" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: error.message };
  return { ok: true };
}
