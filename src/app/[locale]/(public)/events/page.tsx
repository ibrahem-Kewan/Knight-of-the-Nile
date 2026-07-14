import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

const statusKey: Record<string, string> = {
  draft: "stDraft", published: "stPublished", registration_open: "stRegOpen",
  registration_closed: "stRegClosed", ongoing: "stOngoing", completed: "stCompleted", cancelled: "stCancelled",
};

export default async function EventsPage() {
  const locale = await getLocale();
  const t = await getTranslations("events");
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title_ar, title_en, status, start_date, venue")
    .neq("status", "draft")
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .limit(50);

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl text-gold">{t("title")}</h1>
      {!events?.length ? (
        <p className="text-muted-foreground">{t("nonepublic")}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link key={e.id} href={`/events/${e.slug}`}>
              <Card className="h-full transition-colors hover:border-gold">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CalendarDays className="h-5 w-5 text-nile" />
                    <Badge variant="secondary">{t(statusKey[e.status] ?? e.status as never)}</Badge>
                  </div>
                  <CardTitle>{locale === "ar" ? e.title_ar : e.title_en ?? e.title_ar}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {e.venue && <p>{e.venue}</p>}
                  {e.start_date && <p>{new Date(e.start_date).toLocaleDateString(locale)}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
