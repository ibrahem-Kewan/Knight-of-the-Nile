"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

export async function registerToTournament(tournamentId: string, disciplineId: string): Promise<Res> {
  const me = await getProfile();
  if (!me) return { error: "auth" };
  if (me.role !== "athlete" || me.status !== "active") return { error: "only-athletes" };
  if (!disciplineId) return { error: "no-discipline" };

  const supabase = await createClient();

  const { data: tour } = await supabase
    .from("tournaments")
    .select("status, audience, created_by")
    .eq("id", tournamentId)
    .single();
  if (!tour) return { error: "closed" };
  const tt = tour as { status: string; audience: string | null; created_by: string | null };
  if (tt.status !== "registration_open") return { error: "closed" };

  // Coach-scoped tournaments: only the creating coach's own athletes may register.
  if (tt.audience === "coach_athletes" && tt.created_by) {
    const { data: link } = await supabase
      .from("coach_athletes")
      .select("id")
      .eq("coach_id", tt.created_by)
      .eq("athlete_id", me.id)
      .eq("is_current", true)
      .eq("status", "active")
      .maybeSingle();
    if (!link) return { error: "not-eligible" };
  }

  const { error } = await supabase.from("tournament_registrations").insert({
    tournament_id: tournamentId,
    athlete_id: me.id,
    discipline_id: disciplineId,
    registered_by: me.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { error: "already" };
    return { error: "failed" };
  }
  revalidatePath("/athlete/tournaments");
  return { ok: true };
}
