import { getLocale, getTranslations } from "next-intl/server";
import { enumLabel } from "@/lib/i18n/labels";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function CoachResultsPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("pages.coachResults");
  const tt = await getTranslations("table");
  const te = await getTranslations("enums");
  const supabase = await createClient();

  const { data: links } = await supabase.from("coach_athletes").select("athlete_id").eq("coach_id", me.id).eq("is_current", true);
  const ids = (links ?? []).map((l: any) => l.athlete_id);

  const { data: results } = ids.length
    ? await supabase
        .from("results")
        .select("total_points, rank_in_discipline, medal, status, profiles(display_name), tournaments(title_ar, title_en)")
        .in("athlete_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      {!results?.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{tt("athlete")}</th>
              <th className="p-3 text-start">{tt("tournament")}</th>
              <th className="p-3 text-start">{tt("points")}</th>
              <th className="p-3 text-start">{tt("rank")}</th>
            </tr></thead>
            <tbody>
              {results.map((r: any, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 font-medium">{r.profiles?.display_name ?? "—"}</td>
                  <td className="p-3">{ar ? r.tournaments?.title_ar : r.tournaments?.title_en ?? r.tournaments?.title_ar}</td>
                  <td className="p-3">{r.total_points}</td>
                  <td className="p-3">{r.rank_in_discipline ? `#${r.rank_in_discipline}` : "—"}{r.medal ? ` · ${enumLabel(te, "medal", r.medal)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
