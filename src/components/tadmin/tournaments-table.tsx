import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TournamentRowActions } from "@/components/tadmin/tournament-row-actions";
import { TournamentJudges } from "@/components/tadmin/tournament-judges";
import { CreateTournamentForm, type BranchOption } from "@/components/tadmin/create-tournament-form";
import { ContentDeleteButton } from "@/components/shared/content-delete-button";
import { Badge } from "@/components/ui/badge";
import { isPendingDeletion } from "@/lib/content/state";

const statusKey: Record<string, string> = {
  draft: "stDraft", published: "stPublished", registration_open: "stRegOpen",
  registration_closed: "stRegClosed", ongoing: "stOngoing", completed: "stCompleted", cancelled: "stCancelled",
};

// `*` (not an explicit list) so the page keeps working before migrations add new columns
// (deletion_requested_at 0039, branch_id 0040) — see src/lib/content/state.ts.
export const TOURNAMENT_MANAGE_COLUMNS = "*, tournament_disciplines(discipline_id)";

type Sport = { id: string; name_ar: string; name_en: string };
type Discipline = { id: string; sport_id: string; name_ar: string; name_en: string };
type Person = { id: string; name: string };

const personName = (p: { display_name: string | null; first_name_ar: string | null }) =>
  p.display_name ?? p.first_name_ar ?? "—";

/**
 * Shared manage table for admin / coach / judge tournament pages: status flow, category,
 * judges (PR-12), edit and delete (PR-11). Pages pass only rows the viewer may manage.
 * Judge candidates (PR-14): every tournament takes both judges and coaches as judges.
 */
export async function TournamentsTable({
  tournaments,
  sports,
  disciplines,
  judgeCandidates = [],
  coachCandidates = [],
  branches,
}: {
  tournaments: any[];
  sports: Sport[];
  disciplines: Discipline[];
  judgeCandidates?: Person[];
  coachCandidates?: Person[];
  /** The viewing coach's active branches (coach page only) — enables the branch field when editing. */
  branches?: BranchOption[];
}) {
  const locale = await getLocale();
  const t = await getTranslations("tadmin");
  const tm = await getTranslations("manage");
  const supabase = await createClient();

  // Staff, creators and branch names in separate queries (no self/ambiguous embeds).
  const ids = tournaments.map((tr) => tr.id as string);
  const { data: staffRows } = ids.length
    ? await supabase.from("tournament_staff").select("tournament_id, profile_id").in("tournament_id", ids).eq("role_in_tournament", "judge")
    : { data: [] };
  const staff = (staffRows ?? []) as { tournament_id: string; profile_id: string }[];
  const peopleIds = [...new Set([...staff.map((s) => s.profile_id), ...tournaments.map((tr) => tr.created_by).filter(Boolean)])];
  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select("id, role, display_name, first_name_ar").in("id", peopleIds)
    : { data: [] };
  const byId = new Map(((people ?? []) as any[]).map((p) => [p.id as string, p]));
  const branchIds = [...new Set(tournaments.map((tr) => tr.branch_id).filter(Boolean))] as string[];
  const { data: branchRows } = branchIds.length
    ? await supabase.from("coach_branches").select("id, name_ar, name_en").in("id", branchIds)
    : { data: [] };
  const branchName = new Map(((branchRows ?? []) as any[]).map((b) => [b.id as string, locale === "ar" ? b.name_ar : b.name_en ?? b.name_ar]));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-3 text-start">{t("titleAr")}</th>
            <th className="p-3 text-start">{t("status")}</th>
            <th className="p-3 text-start">{t("venue")}</th>
            <th className="p-3 text-start">{t("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((tr) => {
            const title = locale === "ar" ? tr.title_ar : tr.title_en ?? tr.title_ar;
            const disciplineId = tr.tournament_disciplines?.[0]?.discipline_id ?? "";
            const pendingDelete = isPendingDeletion(tr);
            const creator = byId.get(tr.created_by);
            const coachOwned = creator?.role === "coach";
            const current = staff
              .filter((s) => s.tournament_id === tr.id)
              .map((s) => {
                const p = byId.get(s.profile_id);
                return { id: s.profile_id, name: p ? personName(p) : "—", isCoach: p?.role === "coach" };
              });
            const notCreator = (c: Person) => c.id !== tr.created_by;
            const branch = tr.branch_id ? branchName.get(tr.branch_id) : null;
            return (
              <tr key={tr.id} className="border-t border-border align-top">
                <td className="p-3 font-medium">
                  {title}
                  {branch && <div className="text-xs font-normal text-muted-foreground">{t("branchLabel", { name: branch })}</div>}
                  {pendingDelete && (
                    <Badge variant="warning" className="ms-2 align-middle">{tm("pendingDeletion")}</Badge>
                  )}
                </td>
                <td className="p-3"><Badge variant="secondary">{t(statusKey[tr.status] ?? tr.status)}</Badge></td>
                <td className="p-3 text-muted-foreground">{tr.venue ?? "—"}</td>
                <td className="p-3">
                  {pendingDelete ? (
                    <span className="text-xs text-muted-foreground">{tm("pendingDeletionHint")}</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TournamentRowActions
                        id={tr.id}
                        status={tr.status}
                        sportId={tr.sport_id}
                        disciplines={disciplines}
                        currentDisciplineId={disciplineId}
                      />
                      <CreateTournamentForm
                        sports={sports}
                        disciplines={disciplines}
                        branches={coachOwned ? branches : undefined}
                        initial={{ ...tr, discipline_id: disciplineId }}
                      />
                      <ContentDeleteButton type="tournament" id={tr.id} title={title} />
                      <TournamentJudges tournamentId={tr.id} creatorId={coachOwned ? tr.created_by : null} current={current} judgeCandidates={judgeCandidates.filter(notCreator)} coachCandidates={coachCandidates.filter(notCreator)} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
