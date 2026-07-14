import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { UserActions } from "@/components/admin/user-actions";
import { Badge } from "@/components/ui/badge";

const roleKey: Record<string, string> = {
  super_admin: "roleSuper", admin: "roleAdmin", coach: "roleCoach", judge: "roleJudge", athlete: "roleAthlete",
};
const statusKey: Record<string, string> = {
  pending_approval: "stPending", active: "stActive", suspended: "stSuspended", rejected: "stRejected",
};
const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
  pending_approval: "warning", active: "success", suspended: "secondary", rejected: "danger",
};

export default async function AdminUsersPage() {
  const me = await requireRole(["super_admin", "admin"]);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select(
      "id, display_name, first_name_ar, last_name_ar, email, role, status, created_at, approver:profiles!profiles_approved_by_fkey(display_name, first_name_ar)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const viewerIsSuper = me.role === "super_admin";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("manageUsers")}</h1>
      {!users?.length ? (
        <p className="text-muted-foreground">{t("noUsers")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">{t("name")}</th>
                <th className="p-3 text-start">{t("email")}</th>
                <th className="p-3 text-start">{t("role")}</th>
                <th className="p-3 text-start">{t("status")}</th>
                <th className="p-3 text-start">{t("approvedBy")}</th>
                <th className="p-3 text-start">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-border align-top">
                  <td className="p-3 font-medium">
                    {u.display_name ?? `${u.first_name_ar ?? ""} ${u.last_name_ar ?? ""}`}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3"><Badge variant="secondary">{t(roleKey[u.role] ?? u.role)}</Badge></td>
                  <td className="p-3"><Badge variant={statusVariant[u.status] ?? "secondary"}>{t(statusKey[u.status] ?? u.status)}</Badge></td>
                  <td className="p-3 text-muted-foreground">{u.approver?.display_name ?? u.approver?.first_name_ar ?? "—"}</td>
                  <td className="p-3">
                    <UserActions
                      id={u.id}
                      role={u.role}
                      status={u.status}
                      isSelf={u.id === me.id}
                      viewerIsSuper={viewerIsSuper}
                    />
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
