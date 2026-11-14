"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeErrorCode } from "@/lib/db/write-error";
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
    .select("*")
    .eq("id", id)
    .single();
  if (!t) return null;
  const tt = t as {
    id: string; created_by: string | null; audience: string; status: string;
    deleted_at: string | null; deletion_requested_at: string | null;
  };
  // Deleted (or waiting for admin deletion approval) content is no longer editable.
  if (tt.deleted_at || tt.deletion_requested_at) return null;
  let creatorRole: Role = "coach";
  if (tt.created_by) {
    const { data: c } = await supabase.from("profiles").select("role").eq("id", tt.created_by).single();
    creatorRole = ((c as { role: Role } | null)?.role ?? "coach") as Role;
  }
  return { ...tt, creator: { id: tt.created_by ?? "", role: creatorRole } };
}

/** PR-12: a coach's tournament belongs to one of HIS active branches (DB re-checks via trigger 0040). */
async function validBranch(coachId: string, branchId: string): Promise<boolean> {
  if (!branchId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_branches")
    .select("id")
    .eq("id", branchId)
    .eq("coach_id", coachId)
    .eq("is_active", true)
    .maybeSingle();
  return !!data;
}

function writeError(error: { code?: string; message: string }): string {
  console.error("[tournaments]", error.message);
  if (error.message.includes("tournament_branch_invalid")) return "errBranchInvalid";
  return "failed";
}

/**
 * Replace the tournament's single category. Inserts the new one before deleting the others,
 * so a failed insert never leaves the tournament without a category.
 */
async function replaceDiscipline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  disciplineId: string,
): Promise<string | null> {
  const { data: cur, error: readErr } = await supabase
    .from("tournament_disciplines")
    .select("id, discipline_id")
    .eq("tournament_id", tournamentId);
  if (readErr) return writeErrorCode("tournaments.category.read", readErr);
  const rows = (cur ?? []) as { id: string; discipline_id: string }[];
  if (!rows.some((r) => r.discipline_id === disciplineId)) {
    const { error } = await supabase.from("tournament_disciplines").insert({ tournament_id: tournamentId, discipline_id: disciplineId });
    if (error) return writeErrorCode("tournaments.category.insert", error);
  }
  const others = rows.filter((r) => r.discipline_id !== disciplineId).map((r) => r.id);
  if (others.length) {
    const { error } = await supabase.from("tournament_disciplines").delete().in("id", others);
    if (error) return writeErrorCode("tournaments.category.delete", error);
  }
  return null;
}

/** Editable fields shared by create + update (status/audience/owner are not form fields). */
function readFields(formData: FormData) {
  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : null;
  };
  const str = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    return v || null;
  };
  return {
    titleAr: String(formData.get("title_ar") || "").trim(),
    titleEn: String(formData.get("title_en") || "").trim(),
    sportId: String(formData.get("sport_id") || ""),
    disciplineId: String(formData.get("discipline_id") || ""),
    hasBranch: formData.has("branch_id"),
    branchId: String(formData.get("branch_id") || ""),
    scope: str("scope") || "local",
    venue: str("venue"),
    start_date: str("start_date"),
    end_date: str("end_date"),
    registration_end: str("registration_end"),
    max_participants: num("max_participants"),
    fees: num("fees") ?? 0,
  };
}

/** Owner or admin edits a tournament (PR-11). Every change is audited by a DB trigger (0039). */
export async function updateTournament(id: string, formData: FormData): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  const ctx = await loadCtx(id);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, ctx.creator)) return { error: "forbidden" };

  const f = readFields(formData);
  if (!f.titleAr || !f.sportId) return { error: "missing" };
  if (f.fees < 0 || (f.max_participants !== null && f.max_participants < 1)) return { error: "invalid" };

  // Coach tournaments: branch-local (PR-12). The branch field is only sent by the coach's own form;
  // an admin editing it leaves the branch as it is.
  const coachOwned = ctx.creator.role === "coach";
  const branchPatch: { branch_id?: string } = {};
  if (f.hasBranch && coachOwned) {
    if (!(await validBranch(ctx.creator.id, f.branchId))) return { error: "errBranchInvalid" };
    branchPatch.branch_id = f.branchId;
  }

  const supabase = await createClient();
  const { data: upd, error } = await supabase
    .from("tournaments")
    .update({
      ...branchPatch,
      title_ar: f.titleAr,
      title_en: f.titleEn || null,
      sport_id: f.sportId,
      scope: coachOwned ? "local" : f.scope,
      venue: f.venue,
      start_date: f.start_date,
      end_date: f.end_date,
      registration_end: f.registration_end,
      max_participants: f.max_participants,
      fees: f.fees,
    })
    .eq("id", id)
    .select("id");
  if (error) return { error: writeError(error) };
  if (!upd?.length) return { error: "forbidden" };

  // Category: replace only when one was chosen (keeps the current one otherwise).
  if (f.disciplineId) {
    const catErr = await replaceDiscipline(supabase, id, f.disciplineId);
    if (catErr) return { error: catErr };
  }

  revalidatePath("/admin/tournaments");
  revalidatePath("/coach/tournaments");
  revalidatePath("/judge/tournaments");
  revalidatePath("/tournaments");
  revalidatePath("/");
  return { ok: true };
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

  // Coach tournaments are branch-local (PR-12): the coach picks one of his active branches, only
  // that branch's athletes can register, scope is local and the coach is its judge (trigger 0040).
  const isCoach = me.role === "coach";
  const audience = isCoach ? "coach_athletes" : (str("audience") || "public");
  const branchId = String(formData.get("branch_id") || "");
  if (isCoach && !(await validBranch(me.id, branchId))) return { error: "errBranchInvalid" };

  const { data: ins, error } = await supabase
    .from("tournaments")
    .insert({
      title_ar: titleAr,
      title_en: titleEn || null,
      slug: slugify(titleEn || titleAr),
      sport_id: sportId,
      ...(isCoach ? { branch_id: branchId } : {}),
      scope: isCoach ? "local" : str("scope") || "local",
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
  if (error) return { error: writeError(error) };

  // Optional category (discipline) at creation.
  if (disciplineId) {
    const { error: catErr } = await supabase
      .from("tournament_disciplines")
      .insert({ tournament_id: (ins as { id: string }).id, discipline_id: disciplineId });
    // The tournament itself is saved; report the category failure instead of hiding it.
    if (catErr) return { error: writeErrorCode("tournaments.createTournament.category", catErr) };
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
  const catErr = await replaceDiscipline(supabase, tournamentId, disciplineId);
  if (catErr) return { error: catErr };

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
  const { data: upd, error } = await supabase.from("tournaments").update({ status }).eq("id", id).select("id");
  if (error) return { error: writeErrorCode("tournaments.setTournamentStatus", error) };
  if (!upd?.length) return { error: "forbidden" };
  revalidatePath("/admin/tournaments");
  revalidatePath("/coach/tournaments");
  revalidatePath("/judge/tournaments");
  revalidatePath("/tournaments");
  return { ok: true };
}

/**
 * Add / remove a tournament judge (PR-12, widened in PR-14). Manager = admin or the creator.
 * Any tournament takes active judges AND active coaches as judges (both score it — owner
 * decision 13 Nov). The creator coach is always the judge of his own tournament and cannot be
 * removed. DB: set_tournament_judge (0040, already accepts coach|judge), audited in audit_logs.
 */
async function changeJudge(tournamentId: string, profileId: string, add: boolean): Promise<Res> {
  const me = await requireRole(CREATOR_ROLES);
  if (!profileId) return { error: "no-judge" };
  const ctx = await loadCtx(tournamentId);
  if (!ctx) return { error: "not-found" };
  if (!canManageContent(me, ctx.creator)) return { error: "forbidden" };
  if (!add && profileId === ctx.creator.id) return { error: "errJudgeIsCreator" };

  const supabase = await createClient();
  if (add) {
    const { data: p } = await supabase.from("profiles").select("role, status").eq("id", profileId).maybeSingle();
    const pr = p as { role: Role; status: string } | null;
    if (!pr || pr.status !== "active" || (pr.role !== "coach" && pr.role !== "judge")) {
      return { error: "errJudgeInvalid" };
    }
  }
  const { error } = await supabase.rpc("set_tournament_judge", {
    p_tournament: tournamentId,
    p_profile: profileId,
    p_add: add,
  });
  if (error) {
    console.error("[tournaments] set_tournament_judge", error.code, error.message);
    // Function missing on the live DB (migration 0040 not applied) or PostgREST schema cache stale.
    if (error.code === "PGRST202" || error.code === "42883") return { error: "errDbOutdated" };
    if (error.code === "42501") return { error: "forbidden" };
    if (error.message.includes("judge_is_creator")) return { error: "errJudgeIsCreator" };
    if (error.message.includes("judge_invalid")) return { error: "errJudgeInvalid" };
    return { error: "failed" };
  }
  revalidatePath("/admin/tournaments");
  revalidatePath("/coach/tournaments");
  revalidatePath("/judge/tournaments");
  revalidatePath("/coach/scoring");
  revalidatePath("/judge/scoring");
  return { ok: true };
}

export async function assignJudge(tournamentId: string, judgeId: string): Promise<Res> {
  return changeJudge(tournamentId, judgeId, true);
}

export async function removeJudge(tournamentId: string, judgeId: string): Promise<Res> {
  return changeJudge(tournamentId, judgeId, false);
}
