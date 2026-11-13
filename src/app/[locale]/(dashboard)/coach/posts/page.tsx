import { getLocale, getTranslations } from "next-intl/server";
import { enumLabel } from "@/lib/i18n/labels";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function CoachPostsPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("pages.coachPosts");
  const tt = await getTranslations("table");
  const te = await getTranslations("enums");
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts").select("id, title_ar, title_en, status, type, created_at").eq("author_id", me.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      {!posts?.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{tt("title")}</th>
              <th className="p-3 text-start">{tt("type")}</th>
              <th className="p-3 text-start">{tt("status")}</th>
            </tr></thead>
            <tbody>
              {posts.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">{ar ? p.title_ar : p.title_en ?? p.title_ar}</td>
                  <td className="p-3 text-muted-foreground">{enumLabel(te, "postType", p.type)}</td>
                  <td className="p-3"><Badge variant={p.status === "published" ? "success" : "secondary"}>{enumLabel(te, "status", p.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
