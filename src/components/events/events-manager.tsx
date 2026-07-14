import { getLocale, getTranslations } from "next-intl/server";
import { CreateEventForm } from "@/components/events/create-event-form";
import { EventRowActions } from "@/components/events/event-row-actions";
import { Badge } from "@/components/ui/badge";

const statusKey: Record<string, string> = {
  draft: "stDraft", published: "stPublished", registration_open: "stRegOpen",
  registration_closed: "stRegClosed", ongoing: "stOngoing", completed: "stCompleted", cancelled: "stCancelled",
};

type Sport = { id: string; name_ar: string; name_en: string };
type EventRow = { id: string; title_ar: string; title_en: string | null; status: string; venue: string | null };

export async function EventsManager({ sports, events }: { sports: Sport[]; events: EventRow[] }) {
  const locale = await getLocale();
  const t = await getTranslations("events");

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
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="p-3 font-medium">{locale === "ar" ? e.title_ar : e.title_en ?? e.title_ar}</td>
                  <td className="p-3"><Badge variant="secondary">{t(statusKey[e.status] ?? e.status)}</Badge></td>
                  <td className="p-3 text-muted-foreground">{e.venue ?? "—"}</td>
                  <td className="p-3"><EventRowActions id={e.id} status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
