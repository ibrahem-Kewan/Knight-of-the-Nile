import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CoachRegisterForm } from "@/components/coach/coach-register-form";

export default async function CoachRegisterPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("coach_athletes")
    .select("athlete_id, profiles!coach_athletes_athlete_id_fkey(display_name)")
    .eq("coach_id", me.id).eq("is_current", true);
  const athletes = (links ?? []).map((l: any) => ({ id: l.athlete_id, name: l.profiles?.display_name ?? "—" }));

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, title_ar, title_en, sport_id")
    .eq("status", "registration_open").is("deleted_at", null);

  const { data: disciplines } = await supabase
    .from("disciplines")
    .select("id, sport_id, name_ar, name_en")
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "تسجيل متدرب في بطولة" : "Register an athlete"}</h1>
      <CoachRegisterForm
        athletes={athletes}
        tournaments={(tournaments ?? []) as any}
        disciplines={(disciplines ?? []) as any}
      />
    </div>
  );
}
