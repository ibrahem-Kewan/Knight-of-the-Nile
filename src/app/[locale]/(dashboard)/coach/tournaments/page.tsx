import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withoutPendingDeletion } from "@/lib/content/state";
import { Link } from "@/lib/i18n/navigation";
import { CreateTournamentForm, type BranchOption } from "@/components/tadmin/create-tournament-form";
import { TournamentsTable, TOURNAMENT_MANAGE_COLUMNS } from "@/components/tadmin/tournaments-table";

export default async function CoachTournamentsPage() {
  const me = await requireRole(["coach"]);
  const t = await getTranslations("tadmin");
  const supabase = await createClient();

  // Only the coach's own tournaments; ones sent for deletion approval leave this list (PR-11).
  // Branch-local (PR-12): the coach picks one of his active branches and is the judge.
  const [{ data: sports }, { data: disciplines }, { data: tournamentsRows }, { data: branchRows }, { data: coachRows }, { data: judgeRows }] =
    await Promise.all([
      supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
      supabase.from("disciplines").select("id, sport_id, name_ar, name_en").eq("is_active", true),
      supabase
        .from("tournaments")
        .select(TOURNAMENT_MANAGE_COLUMNS)
        .eq("created_by", me.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("coach_branches").select("id, name_ar, name_en").eq("coach_id", me.id).eq("is_active", true).order("created_at"),
      supabase.from("profiles").select("id, display_name, first_name_ar").eq("role", "coach").eq("status", "active").neq("id", me.id),
      supabase.from("profiles").select("id, display_name, first_name_ar").eq("role", "judge").eq("status", "active"),
    ]);
  const tournaments = withoutPendingDeletion(tournamentsRows);
  const branches = (branchRows ?? []) as BranchOption[];
  const coaches = (coachRows ?? []).map((c: any) => ({ id: c.id, name: c.display_name ?? c.first_name_ar ?? "—" }));
  const judges = (judgeRows ?? []).map((j: any) => ({ id: j.id, name: j.display_name ?? j.first_name_ar ?? "—" }));
  const disc = (disciplines ?? []) as any[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("coachScopeNote")}</p>

      {branches.length ? (
        <CreateTournamentForm sports={(sports ?? []) as any} disciplines={disc} branches={branches} />
      ) : (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          {t("needBranch")}{" "}
          <Link href="/coach/branches" className="font-semibold text-gold-deep underline-offset-4 hover:underline dark:text-gold">
            {t("goBranches")}
          </Link>
        </p>
      )}

      {!tournaments.length ? (
        <p className="text-muted-foreground">{t("noTournaments")}</p>
      ) : (
        <TournamentsTable
          tournaments={tournaments}
          sports={(sports ?? []) as any}
          disciplines={disc}
          branches={branches}
          coachCandidates={coaches}
          judgeCandidates={judges}
        />
      )}
    </div>
  );
}
