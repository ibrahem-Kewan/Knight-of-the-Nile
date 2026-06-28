import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RequestActions } from "@/components/admin/request-actions";
import { Badge } from "@/components/ui/badge";

const roleKey: Record<string, string> = { coach: "roleCoach", judge: "roleJudge" };

export default async function RoleRequestsPage() {
  await requireRole(["super_admin", "admin"]);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: reqs } = await supabase
    .from("role_requests")
    .select("id, requested_role, note, created_at, profiles(display_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("roleRequests")}</h1>
      {!reqs?.length ? (
        <p className="text-muted-foreground">{t("noRequests")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">{t("requestedBy")}</th>
                <th className="p-3 text-start">{t("email")}</th>
                <th className="p-3 text-start">{t("requestedRole")}</th>
                <th className="p-3 text-start">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {reqs.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.profiles?.display_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.profiles?.email}</td>
                  <td className="p-3"><Badge>{t(roleKey[r.requested_role] ?? r.requested_role)}</Badge></td>
                  <td className="p-3"><RequestActions id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
