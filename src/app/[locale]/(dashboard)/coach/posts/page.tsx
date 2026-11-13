import { getLocale, getTranslations } from "next-intl/server";
import { enumLabel } from "@/lib/i18n/labels";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withoutPendingDeletion } from "@/lib/content/state";
import { Badge } from "@/components/ui/badge";
import { PostEditForm } from "@/components/content/post-edit-form";
import { ContentDeleteButton } from "@/components/shared/content-delete-button";

export default async function CoachPostsPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("pages.coachPosts");
  const tt = await getTranslations("table");
  const te = await getTranslations("enums");
  const supabase = await createClient();
  const { data: postRows, error } = await supabase
    .from("posts").select("*").eq("author_id", me.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) console.error("[coach/posts]", error.message);
  const posts = withoutPendingDeletion(postRows);

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
              <th className="p-3 text-start">{tt("actions")}</th>
            </tr></thead>
            <tbody>
              {posts.map((p: any) => {
                const title = ar ? p.title_ar : p.title_en ?? p.title_ar;
                return (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="p-3 font-medium">{title}</td>
                    <td className="p-3 text-muted-foreground">{enumLabel(te, "postType", p.type)}</td>
                    <td className="p-3"><Badge variant={p.status === "published" ? "success" : "secondary"}>{enumLabel(te, "status", p.status)}</Badge></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <PostEditForm post={p} />
                        <ContentDeleteButton type="post" id={p.id} title={title} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
