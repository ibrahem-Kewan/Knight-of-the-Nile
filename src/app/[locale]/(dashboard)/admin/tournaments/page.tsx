import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateTournamentForm } from "@/components/tadmin/create-tournament-form";
import { TournamentsTable, TOURNAMENT_MANAGE_COLUMNS } from "@/components/tadmin/tournaments-table";

export default async function AdminTournamentsPage() {
  await requireRole(["super_admin", "admin"]);
  const t = await getTranslations("tadmin");
  const supabase = await createClient();

  // Admin manages every tournament (incl. ones waiting for deletion approval — shown with a badge).
  const [{ data: sports }, { data: disciplines }, { data: tournaments }, { data: judges }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase.from("disciplines").select("id, sport_id, name_ar, name_en").eq("is_active", true),
    supabase
      .from("tournaments")
      .select(TOURNAMENT_MANAGE_COLUMNS)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, first_name_ar").eq("role", "judge").eq("status", "active"),
  ]);

  const judgeList = (judges ?? []).map((j: any) => ({ id: j.id, name: j.display_name ?? j.first_name_ar ?? "—" }));
  const disc = (disciplines ?? []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      </div>

      <CreateTournamentForm sports={(sports ?? []) as any} disciplines={disc} />

      {!tournaments?.length ? (
        <p className="text-muted-foreground">{t("noTournaments")}</p>
      ) : (
        <TournamentsTable tournaments={tournaments} sports={(sports ?? []) as any} disciplines={disc} judges={judgeList} />
      )}
    </div>
  );
}
