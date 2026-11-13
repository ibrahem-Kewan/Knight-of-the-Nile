import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ScoreRow } from "@/components/scoring/score-row";

const SCORABLE = ["ongoing", "registration_closed", "completed"];

export default async function CoachScoringPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const t = await getTranslations("scoring");
  const supabase = await createClient();

  // PR-12: the coach judges only tournaments where he is judging staff (his own branch-local
  // tournaments are assigned automatically; other coaches can add him). All registrants there.
  const { data: staff } = await supabase
    .from("tournament_staff")
    .select("tournament_id")
    .eq("profile_id", me.id)
    .in("role_in_tournament", ["judge", "scorer"]);
  const judgedIds = [...new Set((staff ?? []).map((s: any) => s.tournament_id as string))];

  const { data: regs, error } = judgedIds.length
    ? await supabase
        .from("tournament_registrations")
        .select("id, tournament_id, athlete_id, profiles!tournament_registrations_athlete_id_fkey(display_name, first_name_ar, last_name_ar), disciplines(name_ar, name_en), tournaments(title_ar, title_en, status, deleted_at)")
        .in("tournament_id", judgedIds)
        .neq("status", "rejected")
    : { data: [] as any[], error: null };
  if (error) console.error("[coach/scoring]", error.message);

  const rows = (regs ?? []).filter((r: any) => SCORABLE.includes(r.tournaments?.status) && !r.tournaments?.deleted_at);

  const regIds = rows.map((r: any) => r.id);
  const { data: results } = regIds.length
    ? await supabase.from("results").select("registration_id, total_points, status").in("registration_id", regIds)
    : { data: [] as any[] };
  const resByReg = new Map<string, any>();
  (results ?? []).forEach((r: any) => resByReg.set(r.registration_id, r));

  // Group by tournament for display.
  const byTour = new Map<string, { title: string; rows: any[] }>();
  for (const r of rows) {
    const title = locale === "ar" ? r.tournaments?.title_ar : r.tournaments?.title_en ?? r.tournaments?.title_ar;
    if (!byTour.has(r.tournament_id)) byTour.set(r.tournament_id, { title, rows: [] });
    byTour.get(r.tournament_id)!.rows.push(r);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("coachJudgeNote")}</p>
      </div>
      {byTour.size === 0 ? (
        <p className="text-muted-foreground">{judgedIds.length ? t("noRegs") : t("coachNoJudging")}</p>
      ) : (
        [...byTour.entries()].map(([tid, group]) => (
          <section key={tid} className="space-y-3">
            <h2 className="font-display text-lg">{group.title}</h2>
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
                  {group.rows.map((r: any) => {
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
          </section>
        ))
      )}
    </div>
  );
}
