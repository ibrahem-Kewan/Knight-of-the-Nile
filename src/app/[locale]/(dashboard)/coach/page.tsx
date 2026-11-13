import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";

export default async function CoachOverview() {
  const profile = await requireRole(["coach"]);
  const t = await getTranslations("dash");
  const supabase = await createClient();

  const { count: athletes } = await supabase
    .from("coach_athletes")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", profile.id)
    .eq("is_current", true);

  const { count: courses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", profile.id)
    .is("deleted_at", null);

  // Payments: declarations waiting for this coach, and athletes who are due across active groups.
  const { data: groupRows } = await supabase
    .from("training_groups")
    .select("id, is_active")
    .eq("coach_id", profile.id);
  const allGroups = (groupRows ?? []) as { id: string; is_active: boolean }[];
  const myGroupIds = allGroups.map((g) => g.id);
  const activeGroups = allGroups.filter((g) => g.is_active);
  const { count: pendingPayments } = myGroupIds.length
    ? await supabase
        .from("subscription_cycles")
        .select("id", { count: "exact", head: true })
        .eq("status", "declared")
        .in("group_id", myGroupIds)
    : { count: 0 };
  const { data: openClaimRows } = myGroupIds.length
    ? await supabase
        .from("attendance_claims")
        .select("id, training_sessions!inner(group_id)")
        .eq("status", "open")
        .in("training_sessions.group_id", myGroupIds)
    : { data: [] as unknown[] };
  type OpenClaim = { training_sessions: { group_id: string } | { group_id: string }[] | null };
  const openClaimList = (openClaimRows ?? []) as unknown as OpenClaim[];
  const openClaims = openClaimList.length;
  const firstTs = openClaimList[0]?.training_sessions;
  const firstClaimGroup = (Array.isArray(firstTs) ? firstTs[0] : firstTs)?.group_id;
  const claimsHref = firstClaimGroup ? `/coach/groups/${firstClaimGroup}#group-claims` : "/coach/groups";
  const dueCounts = await Promise.all(
    activeGroups.map(async (g) => {
      // Keep the calendar generated (idempotent, future-only) so consumed sessions are counted correctly.
      await supabase.rpc("ensure_group_sessions", { p_group: g.id });
      const { data } = await supabase.rpc("group_billing", { p_group: g.id });
      return ((data ?? []) as { is_due: boolean }[]).filter((r) => r.is_due).length;
    }),
  );
  const dueAthletes = dueCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("coachTitle")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("myAthletes")} value={athletes ?? 0} href="/coach/athletes" actionLabel={t("viewDetails")} />
        <StatCard label={t("myCourses")} value={courses ?? 0} href="/coach/courses" actionLabel={t("viewDetails")} />
        <StatCard label={t("upcomingTournaments")} value="—" href="/coach/tournaments" actionLabel={t("viewDetails")} />
        <StatCard label={t("pendingPayments")} value={pendingPayments ?? 0} href="/coach/groups" actionLabel={t("viewDetails")} />
        <StatCard label={t("openClaims")} value={openClaims} href={claimsHref} actionLabel={t("viewDetails")} />
        <StatCard label={t("dueAthletes")} value={dueAthletes} href="/coach/groups" actionLabel={t("viewDetails")} />
      </div>
    </div>
  );
}
