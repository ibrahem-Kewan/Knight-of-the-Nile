import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardMobileNav } from "@/components/layout/dashboard-mobile-nav";
import { dashboardNav } from "@/config/navigation";
import { RegistrationTypeSection } from "@/components/profile/registration-type-section";

// Private area: keep every dashboard page out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  // Individual athletes get a dashboard right away; team athletes only once their coach approves.
  if (profile.role === "athlete") {
    const supabase = await createClient();
    const { data: me } = await supabase
      .from("profiles")
      .select("registration_type")
      .eq("id", profile.id)
      .single();
    const isIndividual = (me as { registration_type?: string } | null)?.registration_type !== "team";
    const { data: link } = await supabase
      .from("coach_athletes")
      .select("id")
      .eq("athlete_id", profile.id)
      .eq("is_current", true)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!isIndividual && !link) {
      const t = await getTranslations("auth");
      return (
        <div className="container flex min-h-[50vh] flex-col items-center justify-center py-16">
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
          <div className="mt-10 w-full max-w-xl">
            <RegistrationTypeSection athleteId={profile.id} />
          </div>
        </div>
      );
    }
  }

  const items = dashboardNav[profile.role] ?? [];
  const td = await getTranslations("dash");

  return (
    <>
      <DashboardMobileNav items={items} />
      <div className="container flex gap-0 px-0 py-0 lg:px-4">
        <DashboardSidebar items={items} label={td("sections")} />
        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</section>
      </div>
    </>
  );
}
