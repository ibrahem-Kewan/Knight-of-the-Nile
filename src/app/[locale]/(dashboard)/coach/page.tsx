import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";

export default async function CoachOverview() {
  const profile = await requireRole(["coach"]);
  const supabase = await createClient();

  const { count: athletes } = await supabase
    .from("coach_athletes")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", profile.id)
    .eq("is_current", true);

  const { count: courses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", profile.id);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">لوحة المدرب</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="متدربيّ" value={athletes ?? 0} />
        <StatCard label="دوراتي" value={courses ?? 0} />
        <StatCard label="بطولات قادمة" value="—" />
      </div>
    </div>
  );
}
