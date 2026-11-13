import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateTournamentForm } from "@/components/tadmin/create-tournament-form";
import { TournamentsTable, TOURNAMENT_MANAGE_COLUMNS } from "@/components/tadmin/tournaments-table";

export default async function CoachTournamentsPage() {
  const me = await requireRole(["coach"]);
  const t = await getTranslations("tadmin");
  const supabase = await createClient();

  // Only the coach's own tournaments; ones sent for deletion approval leave this list (PR-11).
  const [{ data: sports }, { data: disciplines }, { data: tournaments }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase.from("disciplines").select("id, sport_id, name_ar, name_en").eq("is_active", true),
    supabase
      .from("tournaments")
      .select(TOURNAMENT_MANAGE_COLUMNS)
      .eq("created_by", me.id)
      .is("deleted_at", null)
      .is("deletion_requested_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const disc = (disciplines ?? []) as any[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("coachScopeNote")}</p>

      <CreateTournamentForm sports={(sports ?? []) as any} disciplines={disc} />

      {!tournaments?.length ? (
        <p className="text-muted-foreground">{t("noTournaments")}</p>
      ) : (
        <TournamentsTable tournaments={tournaments} sports={(sports ?? []) as any} disciplines={disc} />
      )}
    </div>
  );
}
