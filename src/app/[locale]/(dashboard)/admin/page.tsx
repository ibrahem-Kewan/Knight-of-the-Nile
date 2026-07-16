import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";

export default async function AdminOverview() {
  await requireRole(["super_admin", "admin"]);
  const t = await getTranslations("dash");
  const supabase = await createClient();

  const counts = async (table: string, filter?: (q: any) => any) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return count ?? 0;
  };

  const [users, pending, tournaments, pendingResults] = await Promise.all([
    counts("profiles"),
    counts("profiles", (q) => q.eq("status", "pending_approval")),
    counts("tournaments"),
    counts("results", (q) => q.in("status", ["submitted", "under_review"])),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("adminTitle")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("statUsers")} value={users} />
        <StatCard label={t("statPending")} value={pending} hint={t("hintNewAccounts")} />
        <StatCard label={t("statTournaments")} value={tournaments} />
        <StatCard label={t("statPendingResults")} value={pendingResults} hint={t("hintNeedsApproval")} />
      </div>
    </div>
  );
}
