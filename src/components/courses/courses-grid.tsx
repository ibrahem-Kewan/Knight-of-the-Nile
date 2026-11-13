import { getLocale, getTranslations } from "next-intl/server";
import { money } from "@/lib/i18n/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isPendingDeletion } from "@/lib/content/state";
import { CreateCourseForm } from "@/components/courses/create-course-form";
import { CourseStatusButton } from "@/components/courses/course-status-button";
import { ContentDeleteButton } from "@/components/shared/content-delete-button";

/** Columns every courses manage page must select (incl. edit-form values). */
// `*` so the page works before migration 0039 — see src/lib/content/state.ts.
export const COURSE_MANAGE_COLUMNS = "*";

type Sport = { id: string; name_ar: string; name_en: string };

/** Course cards with publish / edit / delete (PR-11). `owners` adds the creator's name (admin view). */
export async function CoursesGrid({
  courses,
  sports,
  owners,
}: {
  courses: any[];
  sports: Sport[];
  owners?: Record<string, string>;
}) {
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("courses");
  const tm = await getTranslations("manage");
  const te = await getTranslations("enums");

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => {
        const title = ar ? c.title_ar : c.title_en ?? c.title_ar;
        const pendingDelete = isPendingDeletion(c);
        return (
          <Card key={c.id} className="flex flex-col">
            <CardHeader className="space-y-1">
              <CardTitle className="break-words text-base">{title}</CardTitle>
              {owners && <p className="text-xs text-muted-foreground">{tm("by", { name: owners[c.owner_id] ?? "—" })}</p>}
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={c.status === "published" ? "success" : "secondary"}>{t(`st_${c.status}` as never)}</Badge>
                <span className="text-sm">{Number(c.price) > 0 ? money(te, c.price, c.currency) : t("free")}</span>
              </div>
              {pendingDelete ? (
                <Badge variant="warning">{tm("pendingDeletion")}</Badge>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <CourseStatusButton id={c.id} status={c.status} />
                  <CreateCourseForm
                    sports={sports}
                    initial={{
                      id: c.id,
                      title_ar: c.title_ar,
                      title_en: c.title_en,
                      sport_id: c.sport_id,
                      level: c.level,
                      price: c.price,
                      certificate_enabled: c.certificate_enabled,
                      description_ar: c.description?.ar ?? null,
                    }}
                  />
                  <ContentDeleteButton type="course" id={c.id} title={title} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
