import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function JudgeDisputesPage() {
  await requireRole(["judge", "super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: disputes } = await supabase
    .from("result_disputes")
    .select("id, reason, status, created_at, profiles!result_disputes_raised_by_fkey(display_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "الاعتراضات" : "Disputes"}</h1>
      {!disputes?.length ? (
        <p className="text-muted-foreground">{ar ? "لا توجد اعتراضات مفتوحة." : "No open disputes."}</p>
      ) : (
        <div className="space-y-3">
          {disputes.map((d: any) => (
            <div key={d.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.profiles?.display_name ?? "—"}</span>
                <Badge variant="warning">{ar ? "مفتوح" : "Open"}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {ar ? (d.reason?.ar ?? "—") : (d.reason?.en ?? d.reason?.ar ?? "—")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
