import { getLocale, getTranslations } from "next-intl/server";
import { enumLabel } from "@/lib/i18n/labels";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isPendingDeletion } from "@/lib/content/state";
import { Badge } from "@/components/ui/badge";
import { PostModerate } from "@/components/admin/post-moderate";
import { PostEditForm } from "@/components/content/post-edit-form";
import { ContentDeleteButton } from "@/components/shared/content-delete-button";

export default async function AdminNewsPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("pages.adminNews");
  const tt = await getTranslations("table");
  const te = await getTranslations("enums");
  const tm = await getTranslations("manage");
  const supabase = await createClient();
  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("*, profiles!posts_author_id_fkey(display_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (postsErr) console.error("[admin/news]", postsErr.code, postsErr.message);

  type PostRow = {
    id: string; title_ar: string; title_en: string | null; type: string; status: string;
    deletion_requested_at?: string | null; profiles: { display_name: string | null } | null;
  };
  const rows = (posts ?? []) as unknown as PostRow[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
      {!rows.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{tt("title")}</th>
              <th className="p-3 text-start">{tt("author")}</th>
              <th className="p-3 text-start">{tt("status")}</th>
              <th className="p-3 text-start">{tt("actions")}</th>
            </tr></thead>
            <tbody>
              {rows.map((p) => {
                const title = ar ? p.title_ar : p.title_en ?? p.title_ar;
                const pendingDelete = isPendingDeletion(p);
                return (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="p-3 font-medium">
                      {title}
                      {pendingDelete && <Badge variant="warning" className="ms-2 align-middle">{tm("pendingDeletion")}</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{p.profiles?.display_name ?? "—"}</td>
                    <td className="p-3"><Badge variant={p.status === "published" ? "success" : p.status === "pending_review" ? "warning" : "secondary"}>{enumLabel(te, "status", p.status)}</Badge></td>
                    <td className="p-3">
                      {pendingDelete ? (
                        <span className="text-xs text-muted-foreground">{tm("pendingDeletionHint")}</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.status !== "published" && <PostModerate id={p.id} />}
                          <PostEditForm post={p} />
                          <ContentDeleteButton type="post" id={p.id} title={title} />
                        </div>
                      )}
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
