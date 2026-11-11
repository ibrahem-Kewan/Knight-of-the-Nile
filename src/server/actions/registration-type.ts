"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

/** Athlete switches between individual / team (and picks or changes coach) from their dashboard. */
export async function changeRegistrationType(formData: FormData): Promise<Res> {
  const me = await requireRole(["athlete"]);
  const type = String(formData.get("registration_type") || "");
  if (type !== "individual" && type !== "team") return { error: "errTypeRequired" };

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  if (type === "individual") {
    const { error } = await supabase
      .from("profiles")
      .update({ registration_type: "individual", primary_coach_id: null })
      .eq("id", me.id);
    if (error) return { error: "errGeneric" };
    // History is kept: links are ended, never deleted.
    await supabase
      .from("coach_athletes")
      .update({ is_current: false, status: "ended", ended_at: today })
      .eq("athlete_id", me.id)
      .in("status", ["pending", "active"]);
  } else {
    const coachId = String(formData.get("coach_id") || "").trim();
    if (!coachId) return { error: "errCoachRequired" };
    const { data: coach } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", coachId)
      .eq("role", "coach")
      .eq("status", "active")
      .maybeSingle();
    if (!coach) return { error: "errCoachRequired" };

    // End links to any other coach.
    await supabase
      .from("coach_athletes")
      .update({ is_current: false, status: "ended", ended_at: today })
      .eq("athlete_id", me.id)
      .neq("coach_id", coachId)
      .in("status", ["pending", "active"]);

    // Keep an existing pending/active link to the same coach; otherwise request a new one.
    const { data: existing } = await supabase
      .from("coach_athletes")
      .select("id")
      .eq("athlete_id", me.id)
      .eq("coach_id", coachId)
      .in("status", ["pending", "active"])
      .limit(1)
      .maybeSingle();
    if (!existing) {
      const { error: insErr } = await supabase.from("coach_athletes").insert({
        coach_id: coachId,
        athlete_id: me.id,
        status: "pending",
        is_current: false,
      });
      if (insErr) {
        if (insErr.code !== "23505") return { error: "errGeneric" };
        // Same-day link already exists (unique coach/athlete/started_at): reopen it as pending.
        await supabase
          .from("coach_athletes")
          .update({ status: "pending", is_current: false, ended_at: null })
          .eq("athlete_id", me.id)
          .eq("coach_id", coachId)
          .eq("started_at", today);
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ registration_type: "team", primary_coach_id: coachId })
      .eq("id", me.id);
    if (error) return { error: "errGeneric" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
