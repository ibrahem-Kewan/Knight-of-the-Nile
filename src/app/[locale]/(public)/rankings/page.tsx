import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function RankingsPage() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("rankings")
    .select(
      "position, total_points, profiles(display_name, first_name_ar, last_name_ar), sports(name_ar, name_en)",
    )
    .order("position", { ascending: true })
    .limit(100);

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl text-gold">{t("rankings")}</h1>
      {!rows?.length ? (
        <p className="text-muted-foreground">لا توجد تصنيفات بعد.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start">
              <tr>
                <th className="p-3 text-start">#</th>
                <th className="p-3 text-start">اللاعب</th>
                <th className="p-3 text-start">الرياضة</th>
                <th className="p-3 text-start">النقاط</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 font-display text-gold">{r.position}</td>
                  <td className="p-3">
                    {r.profiles?.display_name ??
                      `${r.profiles?.first_name_ar ?? ""} ${r.profiles?.last_name_ar ?? ""}`}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {locale === "ar" ? r.sports?.name_ar : r.sports?.name_en}
                  </td>
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
