import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function AdminResultsPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("results")
    .select("total_points, rank_in_discipline, medal, status, profiles(display_name), tournaments(title_ar, title_en), disciplines(name_ar, name_en)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "النتائج" : "Results"}</h1>
      {!rows?.length ? (
        <p className="text-muted-foreground">{ar ? "لا توجد نتائج بعد." : "No results yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{ar ? "اللاعب" : "Athlete"}</th>
              <th className="p-3 text-start">{ar ? "البطولة" : "Tournament"}</th>
              <th className="p-3 text-start">{ar ? "المسار" : "Discipline"}</th>
              <th className="p-3 text-start">{ar ? "النقاط" : "Points"}</th>
              <th className="p-3 text-start">{ar ? "الترتيب" : "Rank"}</th>
              <th className="p-3 text-start">{ar ? "الحالة" : "Status"}</th>
            </tr></thead>
            <tbody>
              {rows.map((r: any, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 font-medium">{r.profiles?.display_name ?? "—"}</td>
                  <td className="p-3">{ar ? r.tournaments?.title_ar : r.tournaments?.title_en ?? r.tournaments?.title_ar}</td>
                  <td className="p-3 text-muted-foreground">{ar ? r.disciplines?.name_ar : r.disciplines?.name_en}</td>
                  <td className="p-3">{r.total_points}</td>
                  <td className="p-3">{r.rank_in_discipline ? `#${r.rank_in_discipline}` : "—"}{r.medal ? ` · ${r.medal}` : ""}</td>
                  <td className="p-3"><Badge variant={r.status === "final" ? "success" : "secondary"}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
