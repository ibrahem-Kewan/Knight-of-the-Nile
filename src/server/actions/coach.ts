"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeErrorCode } from "@/lib/db/write-error";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

/** Coach approves an athlete who chose them at signup. */
export async function approveAthleteLink(linkId: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("coach_athletes")
    .select("id, coach_id")
    .eq("id", linkId)
    .maybeSingle();
  if (!link || (link as { coach_id: string }).coach_id !== me.id) return { error: "forbidden" };

  const { data: upd, error } = await supabase
    .from("coach_athletes")
    .update({ status: "active", is_current: true, approved_by: me.id, approved_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: writeErrorCode("coach.approveAthleteLink", error) };
  if (!upd?.length) return { error: "invalid" };
  revalidatePath("/coach/athletes");
  return { ok: true };
}

export async function rejectAthleteLink(linkId: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("coach_athletes")
    .select("id, coach_id")
    .eq("id", linkId)
    .maybeSingle();
  if (!link || (link as { coach_id: string }).coach_id !== me.id) return { error: "forbidden" };

  const { data: upd, error } = await supabase
    .from("coach_athletes")
    .update({ status: "rejected", is_current: false })
    .eq("id", linkId)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: writeErrorCode("coach.rejectAthleteLink", error) };
  if (!upd?.length) return { error: "invalid" };
  revalidatePath("/coach/athletes");
  return { ok: true };
}

export async function coachRegisterAthlete(
  athleteId: string,
  tournamentId: string,
  disciplineId: string,
): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!athleteId || !tournamentId || !disciplineId) return { error: "missing" };
  const supabase = await createClient();

  // ensure athlete belongs to this coach
  const { data: link } = await supabase
    .from("coach_athletes")
    .select("id")
    .eq("coach_id", me.id)
    .eq("athlete_id", athleteId)
    .eq("is_current", true)
    .eq("status", "active")
    .maybeSingle();
  if (!link) return { error: "not-your-athlete" };

  const { data: tour } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();
  const tt = tour as { status: string; deleted_at: string | null; deletion_requested_at: string | null } | null;
  // Deleted or pending-deletion tournaments accept no new registrations (PR-11).
  if (!tt || tt.deleted_at || tt.deletion_requested_at || tt.status !== "registration_open") return { error: "closed" };

  // Branch-local tournament (PR-12): only current members of that branch's groups. DB trigger 0040 re-checks.
  const branchId = (tour as { branch_id?: string | null }).branch_id;
  if (branchId) {
    const { data: inBranch } = await supabase.rpc("is_branch_athlete", { b: branchId, a: athleteId });
    if (!inBranch) return { error: "not-branch-athlete" };
  }

  const { error } = await supabase.from("tournament_registrations").insert({
    tournament_id: tournamentId,
    athlete_id: athleteId,
    discipline_id: disciplineId,
    registered_by: me.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { error: "already" };
    return { error: "failed" };
  }
  revalidatePath("/coach/register");
  return { ok: true };
}
