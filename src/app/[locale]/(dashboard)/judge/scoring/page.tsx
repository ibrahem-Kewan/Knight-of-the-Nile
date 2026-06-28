import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ScoreRow } from "@/components/scoring/score-row";

export default async function ScoringPage() {
  const me = await requireRole(["judge", "super_admin", "admin"]);
  const locale = await getLocale();
  const t = await getTranslations("scoring");
  const supabase = await createClient();

  // tournaments where this judge is staff (admins see all non-draft)
  let tournamentIds: string[] = [];
  if (me.role === "judge") {
    const { data: staff } = await supabase.from("tournament_staff").select("tournament_id").eq("profile_id", me.id);
    tournamentIds = (staff ?? []).map((s: any) => s.tournament_id);
  }

  let tq = supabase
    .from("tournaments")
    .select("id, title_ar, title_en, status")
    .in("status", ["ongoing", "registration_closed", "completed"])
    .is("deleted_at", null)
    .order("start_date", { ascending: false });
  if (me.role === "judge") {
    if (tournamentIds.length === 0) {
      return (
        <div className="space-y-4">
          <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("noAssigned")}</p>
        </div>
      );
    }
    tq = tq.in("id", tournamentIds);
  }
  const { data: tournaments } = await tq;

  // registrations for those tournaments
  const ids = (tournaments ?? []).map((x: any) => x.id);
  const { data: regs } = ids.length
    ? await supabase
        .from("tournament_registrations")
        .select("id, tournament_id, status, profiles(display_name, first_name_ar, last_name_ar), disciplines(name_ar, name_en)")
        .in("tournament_id", ids)
        .neq("status", "rejected")
    : { data: [] as any[] };

  const { data: results } = ids.length
    ? await supabase.from("results").select("registration_id, total_points, status").in("tournament_id", ids)
    : { data: [] as any[] };
  const resByReg = new Map<string, any>();
  (results ?? []).forEach((r: any) => resByReg.set(r.registration_id, r));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      {(tournaments ?? []).map((tour: any) => {
        const rows = (regs ?? []).filter((r: any) => r.tournament_id === tour.id);
        return (
          <section key={tour.id} className="space-y-3">
            <h2 className="font-display text-lg">{locale === "ar" ? tour.title_ar : tour.title_en ?? tour.title_ar}</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noRegs")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-start">{t("athlete")}</th>
                      <th className="p-3 text-start">{t("discipline")}</th>
                      <th className="p-3 text-start">{t("points")}</th>
                      <th className="p-3 text-start"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => {
                      const res = resByReg.get(r.id);
                      const name = r.profiles?.display_name ?? `${r.profiles?.first_name_ar ?? ""} ${r.profiles?.last_name_ar ?? ""}`;
                      return (
                        <ScoreRow
                          key={r.id}
                          registrationId={r.id}
                          athlete={name}
                          discipline={locale === "ar" ? r.disciplines?.name_ar : r.disciplines?.name_en}
                          initialPoints={res?.total_points ?? null}
                          finalized={res?.status === "final"}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
