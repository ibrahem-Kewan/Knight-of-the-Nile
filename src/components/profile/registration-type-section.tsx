import { createClient } from "@/lib/supabase/server";
import { RegistrationTypeCard } from "./registration-type-card";

/** Loads current registration type + coaches, renders the editable card (athletes only). */
export async function RegistrationTypeSection({ athleteId }: { athleteId: string }) {
  const supabase = await createClient();
  const [{ data: me }, { data: coachRows }, { data: link }] = await Promise.all([
    supabase.from("profiles").select("registration_type, primary_coach_id").eq("id", athleteId).single(),
    supabase
      .from("profiles")
      .select("id, display_name, first_name_ar, last_name_ar")
      .eq("role", "coach")
      .eq("status", "active")
      .order("display_name"),
    supabase
      .from("coach_athletes")
      .select("coach_id, status")
      .eq("athlete_id", athleteId)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const coaches = (coachRows ?? []).map((c: any) => ({
    id: c.id as string,
    name: (c.display_name ?? [c.first_name_ar, c.last_name_ar].filter(Boolean).join(" ")) || "—",
  }));
  const regType = (me as any)?.registration_type === "team" ? "team" : "individual";
  const coachId = ((link as any)?.coach_id ?? (me as any)?.primary_coach_id ?? "") as string;

  return <RegistrationTypeCard initialType={regType} initialCoachId={coachId} coaches={coaches} />;
}
