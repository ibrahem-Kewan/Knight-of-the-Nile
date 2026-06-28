"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

export async function finalizeResult(registrationId: string, points: number): Promise<Res> {
  await requireRole(["judge", "super_admin", "admin"]);
  const supabase = await createClient();

  const { data: reg } = await supabase
    .from("tournament_registrations")
    .select("id, tournament_id, athlete_id, discipline_id")
    .eq("id", registrationId)
    .single();
  if (!reg) return { error: "not-found" };
  const r = reg as { tournament_id: string; athlete_id: string; discipline_id: string };

  // upsert a result row for this registration
  const { data: existing } = await supabase.from("results").select("id").eq("registration_id", registrationId).maybeSingle();

  let resultId: string | undefined = (existing as { id: string } | null)?.id;
  if (resultId) {
    await supabase.from("results").update({ total_points: points, status: "submitted" }).eq("id", resultId);
  } else {
    const { data: ins, error } = await supabase
      .from("results")
      .insert({
        tournament_id: r.tournament_id,
        registration_id: registrationId,
        athlete_id: r.athlete_id,
        discipline_id: r.discipline_id,
        total_points: points,
        status: "submitted",
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    resultId = (ins as { id: string }).id;
  }

  // finalize -> awards ranking points + recomputes rankings (SECURITY DEFINER fn)
  const { error: rpcErr } = await supabase.rpc("approve_result", { p_result: resultId, p_points: points });
  if (rpcErr) return { error: rpcErr.message };

  revalidatePath("/judge/scoring");
  revalidatePath("/rankings");
  return { ok: true };
}
