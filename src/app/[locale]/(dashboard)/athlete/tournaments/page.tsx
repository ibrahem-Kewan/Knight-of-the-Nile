import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

const regStatusKey: Record<string, string> = {
  pending: "pending", approved: "approved", rejected: "rejected", withdrawn: "rejected", checked_in: "approved",
};

export default async function MyTournamentsPage() {
  const me = await requireRole(["athlete"]);
  const locale = await getLocale();
  const t = await getTranslations("treg");
  const supabase = await createClient();

  const { data: regs } = await supabase
    .from("tournament_registrations")
    .select("id, status, tournaments(title_ar, title_en, slug, status), disciplines(name_ar, name_en)")
    .eq("athlete_id", me.id)
    .order("created_at", { ascending: false });

  const { data: results } = await supabase
    .from("results")
    .select("registration_id, total_points, rank_in_discipline, medal, status")
    .eq("athlete_id", me.id);

  const resultByReg = new Map<string, any>();
  (results ?? []).forEach((r: any) => resultByReg.set(r.registration_id, r));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("myTournaments")}</h1>
      {!regs?.length ? (
        <p className="text-muted-foreground">{t("noRegs")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">{t("myTournaments")}</th>
                <th className="p-3 text-start">{t("chooseDiscipline")}</th>
                <th className="p-3 text-start">{t("regStatus")}</th>
                <th className="p-3 text-start">{t("points")}</th>
                <th className="p-3 text-start">{t("rank")}</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r: any) => {
                const res = resultByReg.get(r.id);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-medium">{locale === "ar" ? r.tournaments?.title_ar : r.tournaments?.title_en ?? r.tournaments?.title_ar}</td>
                    <td className="p-3 text-muted-foreground">{locale === "ar" ? r.disciplines?.name_ar : r.disciplines?.name_en}</td>
                    <td className="p-3"><Badge variant="secondary">{t(regStatusKey[r.status] ?? r.status)}</Badge></td>
                    <td className="p-3">{res?.total_points ?? "—"}</td>
                    <td className="p-3">{res?.rank_in_discipline ? `#${res.rank_in_discipline}` : "—"}{res?.medal ? ` · ${res.medal}` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
