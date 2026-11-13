import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";
import { RegistrationTypeSection } from "@/components/profile/registration-type-section";

export default async function AthleteOverview() {
  const profile = await requireRole(["athlete"]);
  const t = await getTranslations("dash");
  const supabase = await createClient();

  const { count: regs } = await supabase
    .from("tournament_registrations")
    .select("id", { count: "exact", head: true })
    .eq("athlete_id", profile.id);

  const { count: certs } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("athlete_id", profile.id);

  // "My training": next session across my open groups + whether any subscription is due.
  const tt = await getTranslations("training");
  const locale = await getLocale();
  const { data: memberRows } = await supabase
    .from("training_group_members")
    .select("group_id")
    .eq("athlete_id", profile.id)
    .is("left_at", null);
  const groupIds = [...new Set(((memberRows ?? []) as { group_id: string }[]).map((m) => m.group_id))];
  let nextSessionLabel = "—";
  let anyDue = false;
  if (groupIds.length) {
    const [{ data: nextRows }, { data: openDecl }, billing] = await Promise.all([
      supabase
        .from("training_sessions")
        .select("scheduled_at")
        .in("group_id", groupIds)
        .eq("status", "scheduled")
        .gt("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1),
      supabase.from("subscription_cycles").select("group_id").eq("athlete_id", profile.id).eq("status", "declared").in("group_id", groupIds),
      Promise.all(groupIds.map((g) => supabase.rpc("member_billing", { p_group: g, p_athlete: profile.id }))),
    ]);
    const next = (nextRows as { scheduled_at: string }[] | null)?.[0];
    if (next) {
      nextSessionLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: locale === "ar",
        timeZone: "Africa/Cairo",
      }).format(new Date(next.scheduled_at));
    }
    const declared = new Set(((openDecl ?? []) as { group_id: string }[]).map((c) => c.group_id));
    anyDue = groupIds.some((g, i) => !declared.has(g) && (billing[i]?.data as { is_due: boolean }[] | null)?.[0]?.is_due === true);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">
        {t("welcome", { name: profile.display_name ?? t("champ") })}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("myTraining")}
          value={nextSessionLabel}
          hint={anyDue ? tt("due") : undefined}
          hintTone="danger"
          valueClassName="text-xl sm:text-2xl"
          href="/athlete/training"
          actionLabel={t("viewDetails")}
        />
        <StatCard label={t("myTournaments")} value={regs ?? 0} href="/athlete/tournaments" actionLabel={t("viewDetails")} />
        <StatCard label={t("myCerts")} value={certs ?? 0} href="/athlete/certificates" actionLabel={t("viewDetails")} />
        <StatCard label={t("myRank")} value="—" href="/rankings" actionLabel={t("viewDetails")} />
      </div>
      <RegistrationTypeSection athleteId={profile.id} />
    </div>
  );
}
