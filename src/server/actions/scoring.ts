"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

export async function finalizeResult(registrationId: string, points: number): Promise<Res> {
  const me = await requireRole(["coach", "judge", "super_admin", "admin"]);
  if (typeof points !== "number" || !Number.isFinite(points) || points < 0) {
    return { error: "errInvalidPoints" };
  }
  const supabase = await createClient();

  const { data: reg } = await supabase
    .from("tournament_registrations")
    .select("id, tournament_id, athlete_id, discipline_id")
    .eq("id", registrationId)
    .single();
  if (!reg) return { error: "errGeneric" };
  const r = reg as { tournament_id: string; athlete_id: string; discipline_id: string };

  // A coach judges only tournaments where he is judging staff — his own branch-local tournaments
  // or ones he was added to (PR-12). DB: results_coach_judge_write + approve_result (0040).
  if (me.role === "coach") {
    const { data: staff } = await supabase
      .from("tournament_staff")
      .select("id")
      .eq("tournament_id", r.tournament_id)
      .eq("profile_id", me.id)
      .in("role_in_tournament", ["judge", "scorer"])
      .maybeSingle();
    if (!staff) return { error: "errForbidden" };
  }

  // upsert a result row for this registration
  const { data: existing } = await supabase.from("results").select("id").eq("registration_id", registrationId).maybeSingle();

  let resultId: string | undefined = (existing as { id: string } | null)?.id;
  if (resultId) {
    const { data: upd, error } = await supabase
      .from("results")
      .update({ total_points: points, status: "submitted" })
      .eq("id", resultId)
      .select("id");
    if (error) { console.error("[scoring]", error.message); return { error: "errGeneric" }; }
    if (!upd?.length) return { error: "errForbidden" };
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
    if (error) { console.error("[scoring]", error.message); return { error: "errGeneric" }; }
    resultId = (ins as { id: string }).id;
  }

  // finalize -> awards ranking points + recomputes rankings (SECURITY DEFINER fn)
  const { error: rpcErr } = await supabase.rpc("approve_result", { p_result: resultId, p_points: points });
  if (rpcErr) {
    if (rpcErr.code === "42501") return { error: "errForbidden" };
    if (rpcErr.code === "22023") return { error: "errInvalidPoints" };
    console.error("[scoring]", rpcErr.message);
    return { error: "errGeneric" };
  }

  revalidatePath("/judge/scoring");
  revalidatePath("/coach/scoring");
  revalidatePath("/rankings");
  return { ok: true };
}
