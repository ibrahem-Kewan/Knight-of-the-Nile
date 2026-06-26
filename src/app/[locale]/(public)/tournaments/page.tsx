import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

const statusLabel: Record<string, string> = {
  registration_open: "التسجيل مفتوح",
  registration_closed: "التسجيل مغلق",
  ongoing: "جارية",
  completed: "منتهية",
  published: "منشورة",
};

export default async function TournamentsPage() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const supabase = await createClient();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, slug, title_ar, title_en, status, start_date, venue, cover_url")
    .neq("status", "draft")
    .order("start_date", { ascending: false })
    .limit(50);

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl text-gold">{t("tournaments")}</h1>
      {!tournaments?.length ? (
        <p className="text-muted-foreground">لا توجد بطولات منشورة بعد.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.slug}`}>
              <Card className="h-full transition-colors hover:border-gold">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Trophy className="h-5 w-5 text-nile" />
                    <Badge variant="secondary">{statusLabel[t.status] ?? t.status}</Badge>
                  </div>
                  <CardTitle>{locale === "ar" ? t.title_ar : t.title_en ?? t.title_ar}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t.venue && <p>{t.venue}</p>}
                  {t.start_date && (
                    <p>{new Date(t.start_date).toLocaleDateString(locale)}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
