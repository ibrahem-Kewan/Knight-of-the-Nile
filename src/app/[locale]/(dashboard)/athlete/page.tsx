import { getTranslations } from "next-intl/server";
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

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">
        {t("welcome", { name: profile.display_name ?? t("champ") })}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("myTournaments")} value={regs ?? 0} href="/athlete/tournaments" actionLabel={t("viewDetails")} />
        <StatCard label={t("myCerts")} value={certs ?? 0} href="/athlete/certificates" actionLabel={t("viewDetails")} />
        <StatCard label={t("myRank")} value="—" href="/rankings" actionLabel={t("viewDetails")} />
      </div>
      <RegistrationTypeSection athleteId={profile.id} />
    </div>
  );
}
