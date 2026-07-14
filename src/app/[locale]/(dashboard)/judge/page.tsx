import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";

export default async function JudgeOverview() {
  const profile = await requireRole(["judge"]);
  const t = await getTranslations("dash");
  const supabase = await createClient();

  const { count: assigned } = await supabase
    .from("tournament_staff")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("judgeTitle")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("myTournaments")} value={assigned ?? 0} />
        <StatCard label={t("resultsPending")} value="—" />
        <StatCard label={t("openDisputes")} value="—" />
      </div>
    </div>
  );
}
