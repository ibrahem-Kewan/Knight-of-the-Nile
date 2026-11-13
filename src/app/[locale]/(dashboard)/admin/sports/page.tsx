import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminSportsPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("pages.adminSports");
  const supabase = await createClient();
  const { data: sports } = await supabase.from("sports").select("id, name_ar, name_en, is_active").order("sort_order");
  const { data: disc } = await supabase.from("disciplines").select("id, sport_id, name_ar, name_en");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      <div className="grid gap-5 md:grid-cols-3">
        {(sports ?? []).map((s: any) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{ar ? s.name_ar : s.name_en}</CardTitle>
                {s.is_active && <Badge variant="success">{t("active")}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {(disc ?? []).filter((d: any) => d.sport_id === s.id).map((d: any) => (
                <span key={d.id} className="rounded-full bg-muted px-2.5 py-1 text-xs">{ar ? d.name_ar : d.name_en}</span>
              ))}
              {(disc ?? []).filter((d: any) => d.sport_id === s.id).length === 0 && (
                <span className="text-xs text-muted-foreground">{t("noDisc")}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
