import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PostModerate } from "@/components/admin/post-moderate";

export default async function AdminNewsPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title_ar, title_en, type, status, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "إدارة الأخبار" : "News management"}</h1>
      {!posts?.length ? (
        <p className="text-muted-foreground">{ar ? "لا توجد منشورات." : "No posts."}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{ar ? "العنوان" : "Title"}</th>
              <th className="p-3 text-start">{ar ? "الكاتب" : "Author"}</th>
              <th className="p-3 text-start">{ar ? "الحالة" : "Status"}</th>
              <th className="p-3 text-start">{ar ? "إجراءات" : "Actions"}</th>
            </tr></thead>
            <tbody>
              {posts.map((p: any) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="p-3 font-medium">{ar ? p.title_ar : p.title_en ?? p.title_ar}</td>
                  <td className="p-3 text-muted-foreground">{p.profiles?.display_name ?? "—"}</td>
                  <td className="p-3"><Badge variant={p.status === "published" ? "success" : p.status === "pending_review" ? "warning" : "secondary"}>{p.status}</Badge></td>
                  <td className="p-3">{p.status !== "published" ? <PostModerate id={p.id} ar={ar} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
