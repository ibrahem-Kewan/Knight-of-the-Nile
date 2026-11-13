import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateTournamentForm } from "@/components/tadmin/create-tournament-form";
import { TournamentsTable, TOURNAMENT_MANAGE_COLUMNS } from "@/components/tadmin/tournaments-table";

export default async function JudgeTournamentsPage() {
  const me = await requireRole(["judge"]);
  const t = await getTranslations("tadmin");
  const supabase = await createClient();

  // A judge manages only the tournaments they created (PR-11 — no longer coaches' ones).
  const [{ data: sports }, { data: disciplines }, { data: tournaments }, { data: judges }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase.from("disciplines").select("id, sport_id, name_ar, name_en").eq("is_active", true),
    supabase
      .from("tournaments")
      .select(TOURNAMENT_MANAGE_COLUMNS)
      .eq("created_by", me.id)
      .is("deleted_at", null)
      .is("deletion_requested_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, first_name_ar").eq("role", "judge").eq("status", "active"),
  ]);

  const judgeList = (judges ?? []).map((j: any) => ({ id: j.id, name: j.display_name ?? j.first_name_ar ?? "—" }));
  const disc = (disciplines ?? []) as any[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>

      <CreateTournamentForm sports={(sports ?? []) as any} disciplines={disc} />

      {!tournaments?.length ? (
        <p className="text-muted-foreground">{t("noTournaments")}</p>
      ) : (
        <TournamentsTable tournaments={tournaments} sports={(sports ?? []) as any} disciplines={disc} judges={judgeList} />
      )}
    </div>
  );
}
