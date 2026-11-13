import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { enumLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAuditPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const t = await getTranslations("pages.audit");
  const tt = await getTranslations("table");
  const te = await getTranslations("enums");
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("type, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      {!logs?.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{tt("type")}</th>
              <th className="p-3 text-start">{tt("user")}</th>
              <th className="p-3 text-start">{tt("time")}</th>
            </tr></thead>
            <tbody>
              {logs.map((l: any, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3">{enumLabel(te, "activity", l.type)}</td>
                  <td className="p-3 text-muted-foreground">{l.profiles?.display_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
