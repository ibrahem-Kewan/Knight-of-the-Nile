import { getLocale, getTranslations } from "next-intl/server";
import { enumLabel } from "@/lib/i18n/labels";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRankingsPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("pages.adminRankings");
  const tt = await getTranslations("table");
  const te = await getTranslations("enums");
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("rankings")
    .select("position, total_points, scope, profiles(display_name, first_name_ar, last_name_ar), sports(name_ar, name_en)")
    .order("position", { ascending: true })
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      {!rows?.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">#</th>
              <th className="p-3 text-start">{tt("athlete")}</th>
              <th className="p-3 text-start">{tt("sport")}</th>
              <th className="p-3 text-start">{tt("scope")}</th>
              <th className="p-3 text-start">{tt("points")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r: any, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 font-display text-gold">{r.position}</td>
                  <td className="p-3">{r.profiles?.display_name ?? `${r.profiles?.first_name_ar ?? ""} ${r.profiles?.last_name_ar ?? ""}`}</td>
                  <td className="p-3 text-muted-foreground">{ar ? r.sports?.name_ar : r.sports?.name_en}</td>
                  <td className="p-3 text-muted-foreground">{enumLabel(te, "scope", r.scope)}</td>
                  <td className="p-3 font-medium">{r.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
