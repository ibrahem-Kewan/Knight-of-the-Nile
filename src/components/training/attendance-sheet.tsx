import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { cairoDateOf } from "@/lib/training/dates";
import { AttendanceSheetClient, type AttendanceMember } from "./attendance-sheet-client";

export type { AttendanceMember } from "./attendance-sheet-client";

type MemberRow = { athlete_id: string; joined_at: string; left_at: string | null; start_date?: string | null };

/**
 * Server wrapper: the page lists members by their old joined_at window, so here the eligible list is re-derived
 * from start_date (PR-15). Back-dated athletes the page did not list are added; athletes whose start day is still
 * ahead are dropped. Saving is enforced again by saveAttendance and the DB guard.
 */
export async function AttendanceSheet({ sessionId, members }: { sessionId: string; members: AttendanceMember[] }) {
  const fallback = <AttendanceSheetClient sessionId={sessionId} members={members} />;
  const supabase = await createClient();

  const { data: session, error: sErr } = await supabase
    .from("training_sessions")
    .select("id, group_id, scheduled_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (sErr || !session) {
    if (sErr) console.error("[attendance-sheet] session query failed", { code: sErr.code, message: sErr.message });
    return fallback;
  }

  const { data: rows, error: mErr } = await supabase.from("training_group_members").select("*").eq("group_id", session.group_id);
  if (mErr) {
    console.error("[attendance-sheet] members query failed", { code: mErr.code, message: mErr.message });
    return fallback;
  }

  const at = session.scheduled_at as string;
  const day = cairoDateOf(at);
  const eligible = new Set(
    ((rows ?? []) as MemberRow[])
      .filter((r) => (r.start_date ? r.start_date <= day : r.joined_at <= at) && (!r.left_at || r.left_at > at))
      .map((r) => r.athlete_id),
  );

  const kept = members.filter((m) => eligible.has(m.athleteId));
  const listed = new Set(members.map((m) => m.athleteId));
  const missingIds = [...eligible].filter((id) => !listed.has(id));

  let added: AttendanceMember[] = [];
  if (missingIds.length) {
    const locale = await getLocale();
    const [{ data: profs, error: pErr }, { data: atts, error: aErr }] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", missingIds),
      supabase
        .from("session_attendance")
        .select("athlete_id, status, score, performance, note")
        .eq("session_id", sessionId)
        .in("athlete_id", missingIds),
    ]);
    if (pErr) console.error("[attendance-sheet] profiles query failed", { code: pErr.code, message: pErr.message });
    if (aErr) console.error("[attendance-sheet] attendance query failed", { code: aErr.code, message: aErr.message });
    const nameById = new Map(((profs ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? "\u2014"]));
    const attBy = new Map(
      ((atts ?? []) as { athlete_id: string; status: "present" | "absent" | null; score: number | null; performance: number | null; note: string | null }[]).map(
        (a) => [a.athlete_id, a],
      ),
    );
    added = missingIds
      .map((id): AttendanceMember => {
        const a = attBy.get(id);
        return {
          athleteId: id,
          name: nameById.get(id) ?? "\u2014",
          status: a?.status ?? null,
          score: a?.score === null || a?.score === undefined ? "" : String(a.score),
          performance: a?.performance ?? null,
          note: a?.note ?? "",
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name, locale));
  }

  return <AttendanceSheetClient sessionId={sessionId} members={[...kept, ...added]} />;
}
