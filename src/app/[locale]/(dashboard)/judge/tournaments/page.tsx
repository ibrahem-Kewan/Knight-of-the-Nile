import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateTournamentForm } from "@/components/tadmin/create-tournament-form";
import { TournamentRowActions } from "@/components/tadmin/tournament-row-actions";
import { Badge } from "@/components/ui/badge";

const statusKey: Record<string, string> = {
  draft: "stDraft", published: "stPublished", registration_open: "stRegOpen",
  registration_closed: "stRegClosed", ongoing: "stOngoing", completed: "stCompleted", cancelled: "stCancelled",
};

export default async function JudgeTournamentsPage() {
  const me = await requireRole(["judge"]);
  const locale = await getLocale();
  const t = await getTranslations("tadmin");
  const supabase = await createClient();

  // A judge manages their own tournaments plus any coach-created tournament.
  const { data: coaches } = await supabase.from("profiles").select("id").eq("role", "coach");
  const creators = [me.id, ...((coaches ?? []) as { id: string }[]).map((c) => c.id)];

  const [{ data: sports }, { data: disciplines }, { data: tournaments }, { data: judges }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase.from("disciplines").select("id, sport_id, name_ar, name_en").eq("is_active", true),
    supabase
      .from("tournaments")
      .select("id, title_ar, title_en, status, venue, sport_id, tournament_disciplines(discipline_id)")
      .in("created_by", creators)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, first_name_ar").eq("role", "judge").eq("status", "active"),
  ]);

  const judgeList = (judges ?? []).map((j: any) => ({ id: j.id, name: j.display_name ?? j.first_name_ar ?? "—" }));
  const disc = (disciplines ?? []) as any[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>

      <CreateTournamentForm sports={(sports ?? []) as any} disciplines={disc} />

      {!tournaments?.length ? (
        <p className="text-muted-foreground">{t("noTournaments")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">{t("titleAr")}</th>
                <th className="p-3 text-start">{t("status")}</th>
                <th className="p-3 text-start">{t("venue")}</th>
                <th className="p-3 text-start">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tr: any) => (
                <tr key={tr.id} className="border-t border-border align-top">
                  <td className="p-3 font-medium">{locale === "ar" ? tr.title_ar : tr.title_en ?? tr.title_ar}</td>
                  <td className="p-3"><Badge variant="secondary">{t(statusKey[tr.status] ?? tr.status)}</Badge></td>
                  <td className="p-3 text-muted-foreground">{tr.venue ?? "—"}</td>
                  <td className="p-3">
                    <TournamentRowActions
                      id={tr.id}
                      status={tr.status}
                      judges={judgeList}
                      sportId={tr.sport_id}
                      disciplines={disc}
                      currentDisciplineId={tr.tournament_disciplines?.[0]?.discipline_id ?? ""}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
