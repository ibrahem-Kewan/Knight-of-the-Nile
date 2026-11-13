import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { AttendanceSheet, type AttendanceMember } from "@/components/training/attendance-sheet";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Props = { params: Promise<{ id: string; sessionId: string }> };

export async function generateMetadata() {
  const t = await getTranslations("training");
  return { title: t("attendance") };
}

export default async function SessionAttendancePage({ params }: Props) {
  const { id, sessionId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(sessionId)) notFound();
  const me = await requireRole(["coach"]);
  const t = await getTranslations("training");
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("training_groups")
    .select("id, name_ar, name_en")
    .eq("id", id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!group) notFound();
  const { data: session } = await supabase
    .from("training_sessions")
    .select("id, scheduled_at, status")
    .eq("id", sessionId)
    .eq("group_id", id)
    .maybeSingle();
  if (!session) notFound();

  const at = new Date(session.scheduled_at);
  const cancelled = session.status === "cancelled";
  const tooEarly = at.getTime() > Date.now() + 60 * 60 * 1000;
  const readOnly = !cancelled && !tooEarly && Date.now() > at.getTime() + WEEK_MS;

  const fmt = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Cairo",
  });
  const Back = ar ? ChevronRight : ChevronLeft;

  let members: AttendanceMember[] = [];
  if (!cancelled && !tooEarly) {
    const { data: memberRows } = await supabase
      .from("training_group_members")
      .select("athlete_id, joined_at")
      .eq("group_id", id)
      .lte("joined_at", session.scheduled_at)
      .or(`left_at.is.null,left_at.gt.${session.scheduled_at}`)
      .order("joined_at", { ascending: true });
    const ids = (memberRows ?? []).map((m) => m.athlete_id as string);
    const [{ data: profiles }, { data: att }] = ids.length
      ? await Promise.all([
          supabase.from("profiles").select("id, display_name").in("id", ids),
          supabase.from("session_attendance").select("athlete_id, status, score, performance, note").eq("session_id", sessionId).in("athlete_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const nameOf = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? "—"]));
    const attOf = new Map((att ?? []).map((a) => [a.athlete_id as string, a]));
    members = ids
      .map((athleteId) => {
        const a = attOf.get(athleteId);
        return {
          athleteId,
          name: nameOf.get(athleteId) ?? "—",
          status: (a?.status as "present" | "absent" | undefined) ?? null,
          score: a?.score === null || a?.score === undefined ? "" : String(Number(a.score)),
          performance: (a?.performance as number | null | undefined) ?? null,
          note: (a?.note as string | null | undefined) ?? "",
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name, ar ? "ar" : "en"));
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/groups/${id}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold"
      >
        <Back className="h-4 w-4" aria-hidden /> {t("backToGroup")}
      </Link>

      <section className="min-w-0 space-y-2 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="att-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 id="att-title" className="min-w-0 break-words font-display text-2xl text-gold">{t("attendance")}</h1>
          <Badge variant={cancelled ? "danger" : at.getTime() > Date.now() ? "default" : "success"}>
            {cancelled ? t("cancelled") : at.getTime() > Date.now() ? t("scheduled") : t("held")}
          </Badge>
        </div>
        <p className="break-words font-medium">{ar ? group.name_ar : group.name_en || group.name_ar}</p>
        <p className="text-sm text-muted-foreground">{fmt.format(at)}</p>
      </section>

      {cancelled ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{t("sessionCancelled")}</p>
      ) : tooEarly ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{t("notYetOpen")}</p>
      ) : !members.length ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{t("noEligibleMembers")}</p>
      ) : readOnly ? (
        <section className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">{t("attendanceReadOnly")}</p>
          <ul className="grid min-w-0 gap-3 md:grid-cols-2">
            {members.map((m) => (
              <li key={m.athleteId} className="min-w-0 space-y-1 rounded-lg border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words font-medium">{m.name}</p>
                  {m.status ? (
                    <Badge variant={m.status === "present" ? "success" : "danger"}>{t(m.status)}</Badge>
                  ) : (
                    <Badge variant="outline">{t("notRecorded")}</Badge>
                  )}
                </div>
                {m.status && (
                  <p className="text-sm text-muted-foreground">
                    {t("score")}: {m.score || "—"} · {t("performance")}: {m.performance ?? "—"}
                  </p>
                )}
                {m.note && <p className="break-words text-sm text-muted-foreground">{m.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <AttendanceSheet sessionId={sessionId} members={members} />
      )}
    </div>
  );
}
