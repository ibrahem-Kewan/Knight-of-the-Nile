import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateCourseForm } from "@/components/courses/create-course-form";
import { CourseStatusButton } from "@/components/courses/course-status-button";

export default async function CoachCoursesPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("courses");
  const supabase = await createClient();

  const [{ data: sports }, { data: courses }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase.from("courses").select("id, title_ar, title_en, status, price, currency").eq("owner_id", me.id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("mine")}</h1>
      <CreateCourseForm sports={(sports ?? []) as any} />

      {!courses?.length ? (
        <p className="text-muted-foreground">{t("none")}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {courses.map((c: any) => (
            <Card key={c.id}>
              <CardHeader><CardTitle className="text-base">{ar ? c.title_ar : c.title_en ?? c.title_ar}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={c.status === "published" ? "success" : "secondary"}>{t(`st_${c.status}` as never)}</Badge>
                  <span className="text-sm">{Number(c.price) > 0 ? `${c.price} ${c.currency}` : t("free")}</span>
                </div>
                <CourseStatusButton id={c.id} status={c.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
