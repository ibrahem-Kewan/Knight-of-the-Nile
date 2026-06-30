import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AthleteCoursesPage() {
  const me = await requireRole(["athlete"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, status, progress, courses(title_ar, title_en, slug)")
    .eq("athlete_id", me.id);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "دوراتي" : "My courses"}</h1>
      {!enrollments?.length ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">{ar ? "لم تشترك في أي دورة بعد." : "You haven't enrolled in any course yet."}</p>
          <Button asChild className="mt-4"><Link href="/courses">{ar ? "تصفح الدورات" : "Browse courses"}</Link></Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {enrollments.map((e: any) => (
            <Card key={e.id}>
              <CardHeader><CardTitle className="text-base">{ar ? e.courses?.title_ar : e.courses?.title_en ?? e.courses?.title_ar}</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="secondary">{e.status}</Badge>
                <span className="text-sm text-muted-foreground">{Math.round(Number(e.progress) || 0)}%</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
