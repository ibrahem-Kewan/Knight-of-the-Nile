import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAuditPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("type, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "سجل النشاط" : "Activity log"}</h1>
      {!logs?.length ? (
        <p className="text-muted-foreground">{ar ? "لا يوجد نشاط مسجّل بعد." : "No activity recorded yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{ar ? "النوع" : "Type"}</th>
              <th className="p-3 text-start">{ar ? "المستخدم" : "User"}</th>
              <th className="p-3 text-start">{ar ? "الوقت" : "Time"}</th>
            </tr></thead>
            <tbody>
              {logs.map((l: any, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3">{l.type}</td>
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
