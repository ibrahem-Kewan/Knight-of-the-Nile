import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function CoachPostsPage() {
  const me = await requireRole(["coach"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts").select("id, title_ar, title_en, status, type, created_at").eq("author_id", me.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{ar ? "منشوراتي" : "My posts"}</h1>
      {!posts?.length ? (
        <p className="text-muted-foreground">{ar ? "لم تكتب أي منشور بعد." : "You haven't written any post yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="p-3 text-start">{ar ? "العنوان" : "Title"}</th>
              <th className="p-3 text-start">{ar ? "النوع" : "Type"}</th>
              <th className="p-3 text-start">{ar ? "الحالة" : "Status"}</th>
            </tr></thead>
            <tbody>
              {posts.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">{ar ? p.title_ar : p.title_en ?? p.title_ar}</td>
                  <td className="p-3 text-muted-foreground">{p.type}</td>
                  <td className="p-3"><Badge variant={p.status === "published" ? "success" : "secondary"}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
