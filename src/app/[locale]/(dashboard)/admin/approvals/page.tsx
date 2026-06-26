import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ApprovalActions } from "@/components/admin/approval-actions";
import { Badge } from "@/components/ui/badge";

const roleLabel: Record<string, string> = {
  athlete: "لاعب",
  coach: "مدرب",
  judge: "حكم",
  admin: "مدير",
};

export default async function ApprovalsPage() {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, display_name, first_name_ar, last_name_ar, email, role, created_at")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">الحسابات بانتظار الاعتماد</h1>
      {!pending?.length ? (
        <p className="text-muted-foreground">لا توجد طلبات معلّقة.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start">الاسم</th>
                <th className="p-3 text-start">البريد</th>
                <th className="p-3 text-start">الدور</th>
                <th className="p-3 text-start">إجراء</th>
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
                    <Badge variant="secondary">{roleLabel[u.role] ?? u.role}</Badge>
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
