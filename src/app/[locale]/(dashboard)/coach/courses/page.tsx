import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withoutPendingDeletion } from "@/lib/content/state";
import { CreateCourseForm } from "@/components/courses/create-course-form";
import { CoursesGrid, COURSE_MANAGE_COLUMNS } from "@/components/courses/courses-grid";

export default async function CoachCoursesPage() {
  const me = await requireRole(["coach"]);
  const t = await getTranslations("courses");
  const supabase = await createClient();

  const [{ data: sports }, { data: coursesRows }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase
      .from("courses")
      .select(COURSE_MANAGE_COLUMNS)
      .eq("owner_id", me.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const courses = withoutPendingDeletion(coursesRows);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("mine")}</h1>
      <CreateCourseForm sports={(sports ?? []) as any} />

      {!courses?.length ? (
        <p className="text-muted-foreground">{t("none")}</p>
      ) : (
        <CoursesGrid courses={courses} sports={(sports ?? []) as any} />
      )}
    </div>
  );
}
