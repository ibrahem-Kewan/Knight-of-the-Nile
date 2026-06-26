import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewsPage() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, slug, title_ar, title_en, type, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);

  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-3xl text-gold">{t("news")}</h1>
      {!posts?.length ? (
        <p className="text-muted-foreground">لا توجد منشورات بعد.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Card key={p.id} className="h-full">
              <CardHeader>
                <CardTitle>{locale === "ar" ? p.title_ar : p.title_en ?? p.title_ar}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {p.published_at && new Date(p.published_at).toLocaleDateString(locale)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
