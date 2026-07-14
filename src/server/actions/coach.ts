"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  await supabase
    .from("coach_athletes")
    .update({ status: "active", is_current: true, approved_by: me.id, approved_at: new Date().toISOString() })
    .eq("id", linkId);
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

  await supabase
    .from("coach_athletes")
    .update({ status: "rejected", is_current: false })
    .eq("id", linkId);
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

  const { data: tour } = await supabase.from("tournaments").select("status").eq("id", tournamentId).single();
  if (!tour || (tour as { status: string }).status !== "registration_open") return { error: "closed" };

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
