import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CoachCoursesPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses").select("id, title_ar, title_en, status, price, currency").eq("owner_id", me.id);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "دوراتي" : "My courses"}</h1>
      {!courses?.length ? (
        <p className="text-muted-foreground">{ar ? "لم تنشئ أي دورة بعد." : "You haven't created any course yet."}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {courses.map((c: any) => (
            <Card key={c.id}>
              <CardHeader><CardTitle className="text-base">{ar ? c.title_ar : c.title_en ?? c.title_ar}</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={c.status === "published" ? "success" : "secondary"}>{c.status}</Badge>
                <span className="text-sm">{Number(c.price) > 0 ? `${c.price} ${c.currency}` : (ar ? "مجاني" : "Free")}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
