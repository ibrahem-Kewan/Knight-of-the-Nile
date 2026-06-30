import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function JudgeTournamentsPage() {
  const me = await requireRole(["judge"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();

  const { data: staff } = await supabase.from("tournament_staff").select("tournament_id").eq("profile_id", me.id);
  const ids = (staff ?? []).map((s: any) => s.tournament_id);
  const { data: tours } = ids.length
    ? await supabase.from("tournaments").select("id, title_ar, title_en, status, venue, start_date").in("id", ids).order("start_date", { ascending: false })
    : { data: [] as any[] };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "بطولاتي" : "My tournaments"}</h1>
      {!tours?.length ? (
        <p className="text-muted-foreground">{ar ? "لم تُعيّن على أي بطولة بعد." : "You are not assigned to any tournament yet."}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {tours.map((t: any) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{ar ? t.title_ar : t.title_en ?? t.title_ar}</CardTitle>
                  <Badge variant="secondary">{t.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t.venue ?? "—"}</p>
                <Button asChild size="sm"><Link href="/judge/scoring">{ar ? "إدخال النتائج" : "Enter results"}</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
