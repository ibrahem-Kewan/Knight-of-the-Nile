import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { withoutPendingDeletion } from "@/lib/content/state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewsPage() {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const tp = await getTranslations("pages.publicNews");
  const supabase = await createClient();

  const { data: postsRows, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(30);
  if (postsError) console.error("[news]", postsError.message);
  const posts = withoutPendingDeletion(postsRows);

  return (
    <div className="container px-4 sm:px-6 lg:px-10 xl:px-14 py-8 sm:py-10 lg:py-12">
      <h1 className="mb-6 font-display text-3xl text-gold">{t("news")}</h1>
      {!posts?.length ? (
        <p className="text-muted-foreground">{tp("empty")}</p>
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
