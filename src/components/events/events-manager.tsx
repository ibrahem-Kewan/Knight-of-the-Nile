import { getLocale, getTranslations } from "next-intl/server";
import { CreateEventForm } from "@/components/events/create-event-form";
import { EventRowActions } from "@/components/events/event-row-actions";
import { ContentDeleteButton } from "@/components/shared/content-delete-button";
import { Badge } from "@/components/ui/badge";
import { isPendingDeletion } from "@/lib/content/state";

const statusKey: Record<string, string> = {
  draft: "stDraft", published: "stPublished", registration_open: "stRegOpen",
  registration_closed: "stRegClosed", ongoing: "stOngoing", completed: "stCompleted", cancelled: "stCancelled",
};

/** Columns every events manage page must select (incl. edit-form values). */
// `*` so the page works before migration 0039 — see src/lib/content/state.ts.
export const EVENT_MANAGE_COLUMNS = "*";

type Sport = { id: string; name_ar: string; name_en: string };
type EventRow = {
  id: string; title_ar: string; title_en: string | null; status: string; venue: string | null;
  sport_id: string | null; start_date: string | null; end_date: string | null; registration_end: string | null;
  max_participants: number | null; fees: number | string | null; deletion_requested_at?: string | null;
};

export async function EventsManager({ sports, events }: { sports: Sport[]; events: EventRow[] }) {
  const locale = await getLocale();
  const t = await getTranslations("events");
  const tm = await getTranslations("manage");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("manage")}</h1>
      <CreateEventForm sports={sports} />

      {!events.length ? (
        <p className="text-muted-foreground">{t("none")}</p>
      ) : (
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
              {events.map((e) => {
                const title = locale === "ar" ? e.title_ar : e.title_en ?? e.title_ar;
                const pendingDelete = isPendingDeletion(e);
                return (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="p-3 font-medium">
                      {title}
                      {pendingDelete && <Badge variant="warning" className="ms-2 align-middle">{tm("pendingDeletion")}</Badge>}
                    </td>
                    <td className="p-3"><Badge variant="secondary">{t(statusKey[e.status] ?? e.status)}</Badge></td>
                    <td className="p-3 text-muted-foreground">{e.venue ?? "—"}</td>
                    <td className="p-3">
                      {pendingDelete ? (
                        <span className="text-xs text-muted-foreground">{tm("pendingDeletionHint")}</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <EventRowActions id={e.id} status={e.status} />
                          <CreateEventForm sports={sports} initial={e} />
                          <ContentDeleteButton type="event" id={e.id} title={title} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
