import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Award } from "lucide-react";

export default async function AthleteCertificatesPage() {
  const me = await requireRole(["athlete"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: certs } = await supabase
    .from("certificates")
    .select("id, title_ar, title_en, serial, issued_at, type")
    .eq("athlete_id", me.id)
    .order("issued_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "شهاداتي" : "My certificates"}</h1>
      {!certs?.length ? (
        <p className="text-muted-foreground">{ar ? "لا توجد شهادات بعد." : "No certificates yet."}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {certs.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-6">
              <Award className="mb-3 h-8 w-8 text-gold" />
              <h3 className="font-semibold">{ar ? c.title_ar : c.title_en ?? c.title_ar}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{ar ? "الرقم التسلسلي" : "Serial"}: {c.serial}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.issued_at).toLocaleDateString(locale)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
