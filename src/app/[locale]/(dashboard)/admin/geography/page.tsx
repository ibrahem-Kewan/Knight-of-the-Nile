import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminGeographyPage() {
  await requireRole(["super_admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: countries } = await supabase.from("countries").select("id, name_ar, name_en, code");
  const { data: govs } = await supabase.from("governorates").select("id, country_id, name_ar, name_en");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "الدول والمحافظات" : "Countries & governorates"}</h1>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {(countries ?? []).map((c: any) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">{ar ? c.name_ar : c.name_en} <span className="text-xs text-muted-foreground">({c.code})</span></h3>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {(govs ?? []).filter((g: any) => g.country_id === c.id).map((g: any) => (
                <li key={g.id}>• {ar ? g.name_ar : g.name_en}</li>
              ))}
              {(govs ?? []).filter((g: any) => g.country_id === c.id).length === 0 && <li>{ar ? "لا محافظات" : "No governorates"}</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
