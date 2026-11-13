import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateCourseForm } from "@/components/courses/create-course-form";
import { CoursesGrid, COURSE_MANAGE_COLUMNS } from "@/components/courses/courses-grid";

/** Admin: every course, any creator — edit / publish / delete (PR-11). */
export default async function AdminCoursesPage() {
  await requireRole(["super_admin", "admin"]);
  const t = await getTranslations("pages.adminCourses");
  const supabase = await createClient();

  const [{ data: sports }, { data: courses, error }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase
      .from("courses")
      .select(COURSE_MANAGE_COLUMNS)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (error) console.error("[admin/courses]", error.message);

  // Owner names in a second query (no self-referencing embeds — see 00-START-HERE §3).
  const ownerIds = [...new Set((courses ?? []).map((c: any) => c.owner_id as string))];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id, display_name, first_name_ar").in("id", ownerIds)
    : { data: [] };
  const ownerMap = Object.fromEntries(
    (owners ?? []).map((o: any) => [o.id, o.display_name ?? o.first_name_ar ?? "—"]),
  ) as Record<string, string>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      <CreateCourseForm sports={(sports ?? []) as any} />
      {!courses?.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <CoursesGrid courses={courses} sports={(sports ?? []) as any} owners={ownerMap} />
      )}
    </div>
  );
}
