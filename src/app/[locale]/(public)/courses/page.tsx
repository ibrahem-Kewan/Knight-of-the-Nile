import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CoursesPage() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, slug, title_ar, title_en, price, currency, level")
    .eq("status", "published")
    .limit(30);

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl text-gold">{t("courses")}</h1>
      {!courses?.length ? (
        <p className="text-muted-foreground">لا توجد دورات منشورة بعد.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="h-full">
              <CardHeader>
                <CardTitle>{locale === "ar" ? c.title_ar : c.title_en ?? c.title_ar}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <Badge>{Number(c.price) > 0 ? `${c.price} ${c.currency}` : "مجاني"}</Badge>
                {c.level && <span className="text-muted-foreground">{c.level}</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
