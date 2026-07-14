import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AthleteLinkActions } from "@/components/coach/athlete-link-actions";

export default async function CoachAthletesPage() {
  const me = await requireRole(["coach"]);
  const t = await getTranslations("coach");
  const supabase = await createClient();

  const [{ data: pending }, { data: links }] = await Promise.all([
    supabase
      .from("coach_athletes")
      .select("id, athlete_id, profiles!coach_athletes_athlete_id_fkey(display_name, email)")
      .eq("coach_id", me.id)
      .eq("status", "pending"),
    supabase
      .from("coach_athletes")
      .select("athlete_id, profiles!coach_athletes_athlete_id_fkey(display_name, email, status)")
      .eq("coach_id", me.id)
      .eq("is_current", true)
      .eq("status", "active"),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>

      {/* Pending join requests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("pendingTitle")}</h2>
        {!pending?.length ? (
          <p className="text-sm text-muted-foreground">{t("noPending")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="p-3 text-start">{t("name")}</th>
                <th className="p-3 text-start">{t("email")}</th>
                <th className="p-3 text-start">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {pending.map((l: any) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-3 font-medium">{l.profiles?.display_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{l.profiles?.email}</td>
                    <td className="p-3"><AthleteLinkActions linkId={l.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Current athletes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("currentTitle")}</h2>
        {!links?.length ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="p-3 text-start">{t("name")}</th>
                <th className="p-3 text-start">{t("email")}</th>
                <th className="p-3 text-start">{t("status")}</th>
              </tr></thead>
              <tbody>
                {links.map((l: any, i: number) => (
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
      </section>
    </div>
  );
}
