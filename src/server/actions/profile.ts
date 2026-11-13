"use server";

// Note: this file never sends role/status/approved_*/deleted_at/created_by; DB trigger 0030 enforces it.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import {
  AVATAR_BUCKET, AVATAR_EXT, AVATAR_MAX_BYTES, AVATAR_TYPES, sniffImageType, type AvatarType,
} from "@/lib/profile/avatar";

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
      // avatar_url is managed only by uploadMyAvatar / removeMyAvatar (migration 0041).
      bio: bioText ? { ar: bioText } : null,
      social,
    })
    .eq("id", me.id);
  if (error) { console.error("[profile]", error.message); return { error: "failed" }; }

  // Optional login-email change (triggers Supabase confirmation email).
  const email = str(formData, "email");
  if (email && email !== me.email) {
    const { error: authErr } = await supabase.auth.updateUser({ email });
    if (authErr) { console.error("[profile]", authErr.message); return { error: "failed" }; }
    await supabase.from("profiles").update({ email }).eq("id", me.id);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Deletes every file in the user's avatar folder except `keep` (best effort, logged). */
async function cleanupAvatarFolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep?: string,
) {
  const { data: files, error } = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
  if (error) { console.error("[avatar] list", error.message); return; }
  const stale = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (stale.length === 0) return;
  const { error: rmErr } = await supabase.storage.from(AVATAR_BUCKET).remove(stale);
  if (rmErr) console.error("[avatar] remove", rmErr.message);
}

/**
 * Upload a profile photo (already resized/cropped in the browser).
 * Double guard: checks here + bucket limits & storage RLS "own folder only" (0041).
 */
export async function uploadMyAvatar(formData: FormData): Promise<Res> {
  const me = await requireAuth();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "avatarMissing" };
  if (file.size > AVATAR_MAX_BYTES) return { error: "avatarTooLarge" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type || !(AVATAR_TYPES as readonly string[]).includes(type)) return { error: "avatarType" };

  const supabase = await createClient();
  const path = `${me.id}/${Date.now()}.${AVATAR_EXT[type as AvatarType]}`;
  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (upErr) {
    console.error("[avatar] upload", upErr.message);
    // Bucket missing = migration 0041 not applied on this database.
    if (/bucket not found/i.test(upErr.message)) return { error: "avatarStorageUnavailable" };
    return { error: "failed" };
  }

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", me.id);
  if (error) {
    console.error("[avatar] profile", error.message);
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return { error: "failed" };
  }

  await cleanupAvatarFolder(supabase, me.id, path);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Remove the profile photo (profile field + stored files). */
export async function removeMyAvatar(): Promise<Res> {
  const me = await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", me.id);
  if (error) { console.error("[avatar] profile", error.message); return { error: "failed" }; }
  await cleanupAvatarFolder(supabase, me.id);
  revalidatePath("/", "layout");
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
  if (error) { console.error("[profile]", error.message); return { error: "failed" }; }
  return { ok: true };
}
