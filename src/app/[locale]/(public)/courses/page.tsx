import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CoursesPage() {
  const locale = await getLocale();
  const nav = await getTranslations("nav");
  const t = await getTranslations("courses");
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, slug, title_ar, title_en, price, currency, level")
    .eq("status", "published")
    .limit(30);

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl text-gold">{nav("courses")}</h1>
      {!courses?.length ? (
        <p className="text-muted-foreground">{t("noPublic")}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const title = locale === "ar" ? c.title_ar : c.title_en ?? c.title_ar;
            const paid = Number(c.price) > 0;
            return (
              <Card key={c.id} className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="mt-auto space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge>{paid ? `${c.price} ${c.currency}` : t("free")}</Badge>
                    {c.level && <span className="text-muted-foreground">{c.level}</span>}
                  </div>
                  {paid && (
                    <Button asChild size="sm" className="w-full">
                      <Link
                        href={`/checkout?context=course&id=${c.id}&amount=${c.price}&currency=${c.currency}&title=${encodeURIComponent(title)}`}
                      >
                        {t("subscribe")}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
