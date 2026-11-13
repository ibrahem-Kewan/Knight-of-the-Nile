import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ApprovalActions } from "@/components/admin/approval-actions";
import { Badge } from "@/components/ui/badge";
import { enumLabel } from "@/lib/i18n/labels";

export default async function ApprovalsPage() {
  await requireRole(["super_admin", "admin"]);
  const t = await getTranslations("pages.approvals");
  const tt = await getTranslations("table");
  const te = await getTranslations("enums");
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, display_name, first_name_ar, last_name_ar, email, role, created_at")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      {!pending?.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">{tt("name")}</th>
                <th className="p-3 text-start">{tt("email")}</th>
                <th className="p-3 text-start">{tt("role")}</th>
                <th className="p-3 text-start">{tt("action")}</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">
                    {u.display_name ?? `${u.first_name_ar ?? ""} ${u.last_name_ar ?? ""}`}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{enumLabel(te, "role", u.role)}</Badge>
                  </td>
                  <td className="p-3">
                    <ApprovalActions userId={u.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
