import { getLocale, getTranslations } from "next-intl/server";
import { TournamentRowActions } from "@/components/tadmin/tournament-row-actions";
import { CreateTournamentForm } from "@/components/tadmin/create-tournament-form";
import { ContentDeleteButton } from "@/components/shared/content-delete-button";
import { Badge } from "@/components/ui/badge";

const statusKey: Record<string, string> = {
  draft: "stDraft", published: "stPublished", registration_open: "stRegOpen",
  registration_closed: "stRegClosed", ongoing: "stOngoing", completed: "stCompleted", cancelled: "stCancelled",
};

/** Columns every manage page must select for this table (incl. edit-form values). */
export const TOURNAMENT_MANAGE_COLUMNS =
  "id, title_ar, title_en, status, venue, sport_id, scope, start_date, end_date, registration_end, max_participants, fees, deletion_requested_at, tournament_disciplines(discipline_id)";

type Sport = { id: string; name_ar: string; name_en: string };
type Discipline = { id: string; sport_id: string; name_ar: string; name_en: string };
type Judge = { id: string; name: string };

/**
 * Shared manage table for admin / coach / judge tournament pages (PR-11): status flow,
 * category, judge assignment, edit and delete. Pages pass only rows the viewer may manage.
 */
export async function TournamentsTable({
  tournaments,
  sports,
  disciplines,
  judges = [],
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tournaments: any[];
  sports: Sport[];
  disciplines: Discipline[];
  judges?: Judge[];
}) {
  const locale = await getLocale();
  const t = await getTranslations("tadmin");
  const tm = await getTranslations("manage");

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
            const pendingDelete = !!tr.deletion_requested_at;
            return (
              <tr key={tr.id} className="border-t border-border align-top">
                <td className="p-3 font-medium">
                  {title}
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
                        judges={judges}
                        sportId={tr.sport_id}
                        disciplines={disciplines}
                        currentDisciplineId={disciplineId}
                      />
                      <CreateTournamentForm
                        sports={sports}
                        disciplines={disciplines}
                        initial={{ ...tr, discipline_id: disciplineId }}
                      />
                      <ContentDeleteButton type="tournament" id={tr.id} title={title} />
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
