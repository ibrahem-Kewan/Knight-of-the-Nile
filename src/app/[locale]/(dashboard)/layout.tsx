import { getTranslations } from "next-intl/server";
import { Clock } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { dashboardNav } from "@/config/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  // Athletes only get a dashboard once a coach has approved them.
  if (profile.role === "athlete") {
    const supabase = await createClient();
    const { data: link } = await supabase
      .from("coach_athletes")
      .select("id")
      .eq("athlete_id", profile.id)
      .eq("is_current", true)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!link) {
      const t = await getTranslations("auth");
      return (
        <div className="container flex min-h-[50vh] items-center justify-center py-16">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
              <Clock className="h-8 w-8 text-gold" />
            </div>
            <h1 className="font-display text-2xl text-gold">{t("awaitingCoachTitle")}</h1>
            <p className="mt-3 text-muted-foreground">{t("awaitingCoachNote")}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/">{t("backHome")}</Link>
            </Button>
          </div>
        </div>
      );
    }
  }

  const items = dashboardNav[profile.role] ?? [];

  return (
    <div className="container flex gap-0 py-0">
      <DashboardSidebar items={items} />
      <section className="flex-1 p-6">{children}</section>
    </div>
  );
}
