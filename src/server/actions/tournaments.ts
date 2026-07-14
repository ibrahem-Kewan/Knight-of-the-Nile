"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { CREATOR_ROLES, canManageContent } from "@/lib/auth/permissions";
import type { Role } from "@/config/roles";

type Res = { ok?: boolean; error?: string };

function slugify(s: string) {
  const base = s.toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "tournament") + "-" + Math.random().toString(36).slice(2, 6);
}

/** Load a tournament plus its creator's role, for permission checks. */
async function loadCtx(id: string) {
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("id, created_by, audience, status")
    .eq("id", id)
    .single();
  if (!t) return null;
  const tt = t as { id: string; created_by: string | null; audience: string; status: string };
  let creatorRole: Role = "coach";
  if (tt.created_by) {
    const { data: c } = await supabase.from("profiles").select("role").eq("id", tt.created_by).single();
    creatorRole = ((c as { role: Role } | null)?.role ?? "coach") as Role;
  }
  return { ...tt, creator: { id: tt.created_by ?? "", role: creatorRole } };
}

export async function createTournament(formData: FormData): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const supabase = await createClient();

  const titleAr = String(formData.get("title_ar") || "").trim();
  const titleEn = String(formData.get("title_en") || "").trim();
  const sportId = String(formData.get("sport_id") || "");
  const disciplineId = String(formData.get("discipline_id") || "");
  if (!titleAr || !sportId) return { error: "missing" };

  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : null;
  };
  const str = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v || null;
  };

  // Coach tournaments are for that coach's own athletes by default.
  const audience = me.role === "coach" ? "coach_athletes" : (str("audience") || "public");

  const { data: ins, error } = await supabase
    .from("tournaments")
    .insert({
      title_ar: titleAr,
      title_en: titleEn || null,
      slug: slugify(titleEn || titleAr),
      sport_id: sportId,
      scope: str("scope") || "local",
      venue: str("venue"),
      start_date: str("start_date"),
      end_date: str("end_date"),
      registration_end: str("registration_end"),
      max_participants: num("max_participants"),
      fees: num("fees") ?? 0,
      audience,
      status: "draft",
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Optional category (discipline) at creation.
  if (disciplineId) {
    await supabase
      .from("tournament_disciplines")
      .insert({ tournament_id: (ins as { id: string }).id, discipline_id: disciplineId });
  }

  revalidatePath("/admin/tournaments");
  revalidatePath("/coach/tournaments");
  revalidatePath("/judge/tournaments");
  return { ok: true };
}

/** Set / change the tournament category (single primary discipline). */
export async function setTournamentDiscipline(tournamentId: string, disciplineId: string): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const ctx = await loadCtx(tournamentId);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, ctx.creator)) return { error: "forbidden" };
  if (!disciplineId) return { error: "no-discipline" };

  const supabase = await createClient();
  await supabase.from("tournament_disciplines").delete().eq("tournament_id", tournamentId);
  const { error } = await supabase
    .from("tournament_disciplines")
    .insert({ tournament_id: tournamentId, discipline_id: disciplineId });
  if (error) return { error: error.message };

  revalidatePath("/admin/tournaments");
  revalidatePath("/coach/tournaments");
  revalidatePath("/judge/tournaments");
  return { ok: true };
}

export async function setTournamentStatus(id: string, status: string): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const ctx = await loadCtx(id);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, ctx.creator)) return { error: "forbidden" };

  const supabase = await createClient();
  await supabase.from("tournaments").update({ status }).eq("id", id);
  revalidatePath("/admin/tournaments");
  revalidatePath("/coach/tournaments");
  revalidatePath("/judge/tournaments");
  revalidatePath("/tournaments");
  return { ok: true };
}

export async function assignJudge(tournamentId: string, judgeId: string): Promise<Res> {
  const me = await requireRole(["super_admin", "admin", "judge"]);
  if (!judgeId) return { error: "no-judge" };
  const ctx = await loadCtx(tournamentId);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, ctx.creator)) return { error: "forbidden" };

  const supabase = await createClient();
  await supabase
    .from("tournament_staff")
    .insert({ tournament_id: tournamentId, profile_id: judgeId, role_in_tournament: "judge" });
  revalidatePath("/admin/tournaments");
  return { ok: true };
}
