"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getProfile } from "@/lib/auth/session";
import { CREATOR_ROLES, canManageContent } from "@/lib/auth/permissions";
import type { Role } from "@/config/roles";

type Res = { ok?: boolean; error?: string };

function slugify(s: string) {
  const base = s.toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "event") + "-" + Math.random().toString(36).slice(2, 6);
}

async function loadCtx(id: string) {
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("events")
    .select("id, created_by, status")
    .eq("id", id)
    .single();
  if (!e) return null;
  const ee = e as { id: string; created_by: string | null; status: string };
  let creatorRole: Role = "coach";
  if (ee.created_by) {
    const { data: c } = await supabase.from("profiles").select("role").eq("id", ee.created_by).single();
    creatorRole = ((c as { role: Role } | null)?.role ?? "coach") as Role;
  }
  return { ...ee, creator: { id: ee.created_by ?? "", role: creatorRole } };
}

export async function createEvent(formData: FormData): Promise<Res> {
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

  const audience = me.role === "coach" ? "coach_athletes" : "public";

  const { error } = await supabase.from("events").insert({
    title_ar: titleAr,
    title_en: titleEn || null,
    slug: slugify(titleEn || titleAr),
    sport_id: str("sport_id"),
    venue: str("venue"),
    start_date: str("start_date"),
    end_date: str("end_date"),
    registration_end: str("registration_end"),
    max_participants: num("max_participants"),
    fees: num("fees") ?? 0,
    audience,
    status: "draft",
    created_by: me.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/events");
  revalidatePath("/coach/events");
  revalidatePath("/judge/events");
  return { ok: true };
}

export async function setEventStatus(id: string, status: string): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const ctx = await loadCtx(id);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, ctx.creator)) return { error: "forbidden" };

  const supabase = await createClient();
  await supabase.from("events").update({ status }).eq("id", id);
  revalidatePath("/admin/events");
  revalidatePath("/coach/events");
  revalidatePath("/judge/events");
  revalidatePath("/events");
  return { ok: true };
}

export async function registerToEvent(eventId: string): Promise<Res> {
  const me = await getProfile();
  if (!me) return { error: "auth" };
  if (me.status !== "active") return { error: "inactive" };

  const supabase = await createClient();
  const { data: ev } = await supabase.from("events").select("status").eq("id", eventId).single();
  if (!ev || (ev as { status: string }).status !== "registration_open") return { error: "closed" };

  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    profile_id: me.id,
    registered_by: me.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { error: "already" };
    return { error: "failed" };
  }
  revalidatePath("/events");
  return { ok: true };
}
