import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CoachAthletesPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("coach_athletes")
    .select("athlete_id, profiles!coach_athletes_athlete_id_fkey(display_name, email, status, governorate_id)")
    .eq("coach_id", me.id)
    .eq("is_current", true);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "متدربيّ" : "My athletes"}</h1>
      {!links?.length ? (
        <p className="text-muted-foreground">{ar ? "لا يوجد متدربون تابعون لك بعد." : "You have no athletes yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{ar ? "الاسم" : "Name"}</th>
              <th className="p-3 text-start">{ar ? "البريد" : "Email"}</th>
              <th className="p-3 text-start">{ar ? "الحالة" : "Status"}</th>
            </tr></thead>
            <tbody>
              {links.map((l: any, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 font-medium">{l.profiles?.display_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{l.profiles?.email}</td>
                  <td className="p-3 text-muted-foreground">{l.profiles?.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
