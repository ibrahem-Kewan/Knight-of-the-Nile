import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { QrCode } from "@/components/athlete/qr-code";
import { Badge } from "@/components/ui/badge";

export default async function MembershipPage() {
  const me = await requireRole(["athlete"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("status, start_date, end_date, card_number")
    .eq("profile_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const name = me.display_name ?? me.first_name_ar ?? "";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "بطاقة العضوية" : "Membership card"}</h1>
      {!m ? (
        <p className="text-muted-foreground">{ar ? "لا توجد عضوية فعّالة. تواصل مع الإدارة لتفعيل عضويتك." : "No active membership. Contact the admin to activate it."}</p>
      ) : (
        <div className="max-w-md overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-ink to-nile text-sand shadow-xl">
          <div className="flex items-start justify-between p-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold">فارس النيل · Knight of the Nile</p>
              <h2 className="mt-3 font-display text-xl">{name}</h2>
              <p className="mt-1 text-sm text-sand/70">{ar ? "رقم البطاقة" : "Card no."}: {(m as any).card_number ?? "—"}</p>
              <p className="text-sm text-sand/70">
                {ar ? "تنتهي" : "Expires"}: {(m as any).end_date ? new Date((m as any).end_date).toLocaleDateString(locale) : "—"}
              </p>
              <Badge variant="success" className="mt-3">{(m as any).status}</Badge>
            </div>
            <QrCode value={`FN-MEMBER:${(m as any).card_number ?? me.id}`} size={104} />
          </div>
        </div>
      )}
    </div>
  );
}
