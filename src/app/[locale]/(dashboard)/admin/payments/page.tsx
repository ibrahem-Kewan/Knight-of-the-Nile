import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { MarkPaidButton } from "@/components/admin/mark-paid-button";
import { Badge } from "@/components/ui/badge";

export default async function AdminPaymentsPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const t = await getTranslations("payadmin");
  const supabase = await createClient();

  const [{ data: settings }, { data: payments }] = await Promise.all([
    supabase.from("payment_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount, currency, context, external_ref, status, created_at, profiles!payments_payer_id_fkey(display_name, email)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>

      <PaymentSettingsForm initial={(settings ?? {}) as any} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("payments")}</h2>
        {!payments?.length ? (
          <p className="text-sm text-muted-foreground">{t("noPayments")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="p-3 text-start">{t("payer")}</th>
                <th className="p-3 text-start">{t("context")}</th>
                <th className="p-3 text-start">{t("amount")}</th>
                <th className="p-3 text-start">{t("ref")}</th>
                <th className="p-3 text-start">{t("status")}</th>
                <th className="p-3 text-start">{t("action")}</th>
              </tr></thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{p.profiles?.display_name ?? p.profiles?.email ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{p.context}</td>
                    <td className="p-3">{Number(p.amount)} {p.currency}</td>
                    <td className="p-3 text-muted-foreground" dir="ltr">{p.external_ref ?? "—"}</td>
                    <td className="p-3"><Badge variant={p.status === "paid" ? "success" : "secondary"}>{t(`st_${p.status}` as never)}</Badge></td>
                    <td className="p-3">{p.status !== "paid" && <MarkPaidButton id={p.id} />}</td>
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
