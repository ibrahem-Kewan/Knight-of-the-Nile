import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { DeletionRequestActions } from "@/components/admin/deletion-request-actions";

type Req = {
  id: string; entity_type: "tournament" | "event" | "course" | "post"; entity_id: string;
  requested_by: string; reason: string | null; registrations_count: number; status: string;
  created_at: string; resolved_by: string | null; resolved_at: string | null; resolution_note: string | null;
};

const TABLES = { tournament: "tournaments", event: "events", course: "courses", post: "posts" } as const;

/** Admin queue: creators' delete requests on content that has registrations/payments (PR-11). */
export default async function DeletionRequestsPage() {
  await requireRole(["super_admin", "admin"]);
  const locale = await getLocale();
  const ar = locale === "ar";
  const t = await getTranslations("pages.deletionRequests");
  const tm = await getTranslations("manage");
  const supabase = await createClient();

  const [{ data: pendingRows, error }, { data: historyRows }] = await Promise.all([
    supabase.from("content_deletion_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
    supabase.from("content_deletion_requests").select("*").neq("status", "pending").order("resolved_at", { ascending: false }).limit(20),
  ]);
  if (error) console.error("[deletion-requests]", error.message);
  const pending = (pendingRows ?? []) as Req[];
  const history = (historyRows ?? []) as Req[];
  const all = [...pending, ...history];

  // Titles per entity type and people names — separate queries (no polymorphic / self embeds).
  const titles: Record<string, string> = {};
  await Promise.all(
    (Object.keys(TABLES) as (keyof typeof TABLES)[]).map(async (type) => {
      const ids = all.filter((r) => r.entity_type === type).map((r) => r.entity_id);
      if (!ids.length) return;
      const { data } = await supabase.from(TABLES[type]).select("id, title_ar, title_en").in("id", ids);
      for (const row of (data ?? []) as { id: string; title_ar: string; title_en: string | null }[]) {
        titles[row.id] = ar ? row.title_ar : row.title_en ?? row.title_ar;
      }
    }),
  );
  const peopleIds = [...new Set(all.flatMap((r) => [r.requested_by, r.resolved_by]).filter(Boolean) as string[])];
  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select("id, display_name, first_name_ar").in("id", peopleIds)
    : { data: [] };
  const names = Object.fromEntries(
    ((people ?? []) as { id: string; display_name: string | null; first_name_ar: string | null }[]).map((p) => [
      p.id,
      p.display_name ?? p.first_name_ar ?? "—",
    ]),
  ) as Record<string, string>;
  const when = (d: string | null) => (d ? new Date(d).toLocaleString(locale) : "—");

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-gold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      {!pending.length ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {pending.map((r) => {
            const title = titles[r.entity_id] ?? "—";
            return (
              <li key={r.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{tm(`types.${r.entity_type}`)}</Badge>
                  <Badge variant="warning">{t("registrations", { count: r.registrations_count })}</Badge>
                </div>
                <p className="break-words font-medium">{title}</p>
                <dl className="grid gap-1 text-sm text-muted-foreground">
                  <div><dt className="inline">{t("requestedBy")}: </dt><dd className="inline text-foreground">{names[r.requested_by] ?? "—"}</dd></div>
                  <div><dt className="inline">{t("requestedAt")}: </dt><dd className="inline">{when(r.created_at)}</dd></div>
                  <div><dt className="inline">{t("reason")}: </dt><dd className="inline break-words text-foreground">{r.reason ?? t("noReason")}</dd></div>
                </dl>
                <DeletionRequestActions requestId={r.id} title={title} />
              </li>
            );
          })}
        </ul>
      )}

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg text-gold">{t("history")}</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-start">{t("item")}</th>
                  <th className="p-3 text-start">{t("requestedBy")}</th>
                  <th className="p-3 text-start">{t("decision")}</th>
                  <th className="p-3 text-start">{t("resolvedBy")}</th>
                  <th className="p-3 text-start">{t("note")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground">{tm(`types.${r.entity_type}`)} · </span>
                      {titles[r.entity_id] ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{names[r.requested_by] ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={r.status === "approved" ? "danger" : "success"}>{t(`status.${r.status}`)}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.resolved_by ? names[r.resolved_by] ?? "—" : "—"}
                      <div className="text-xs">{when(r.resolved_at)}</div>
                    </td>
                    <td className="p-3 text-muted-foreground break-words">{r.resolution_note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
