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

  const { data: tour } = await supabase.from("tournaments").select("status").eq("id", tournamentId).single();
  if (!tour || (tour as { status: string }).status !== "registration_open") return { error: "closed" };

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
