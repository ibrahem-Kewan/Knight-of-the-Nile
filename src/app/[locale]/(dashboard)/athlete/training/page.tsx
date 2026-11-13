import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  AthleteGroupPanel,
  type PanelAttendance,
  type PanelBilling,
  type PanelBranch,
  type PanelClaim,
  type PanelCycle,
  type PanelGroup,
  type PanelSession,
} from "@/components/training/athlete-group-panel";

export async function generateMetadata() {
  const t = await getTranslations("training");
  return { title: t("myTraining") };
}

type GroupRow = PanelGroup & { branch_id: string; sport_id: string | null; coach_id: string };
type Named = { id: string; name_ar: string; name_en: string | null };
type BranchRow = NonNullable<PanelBranch> & { id: string };

const DAY = 24 * 60 * 60 * 1000;

export default async function AthleteTrainingPage() {
  const me = await requireRole(["athlete"]);
  const t = await getTranslations("training");
  const loc = await getLocale();
  const supabase = await createClient();

  const { data: memberRows } = await supabase
    .from("training_group_members")
    .select("group_id, joined_at, left_at")
    .eq("athlete_id", me.id)
    .order("joined_at", { ascending: true });
  const allWindows = (memberRows ?? []) as { group_id: string; joined_at: string; left_at: string | null }[];
  // Groups where I am an open member; closed windows still bound which past sessions count as mine.
  const groupIds = [...new Set(allWindows.filter((m) => !m.left_at).map((m) => m.group_id))];

  const intro = (
    <div className="space-y-1">
      <h1 className="font-display text-2xl text-gold">{t("myTraining")}</h1>
      <p className="text-sm text-muted-foreground">{t("myTrainingIntro")}</p>
    </div>
  );

  if (!groupIds.length) {
    return (
      <div className="space-y-6">
        {intro}
        <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("notInGroup")}
        </p>
      </div>
    );
  }

  const { data: groupRows } = await supabase
    .from("training_groups")
    .select("id, coach_id, branch_id, sport_id, name_ar, name_en, weekdays, start_time, duration_minutes, sessions_per_cycle, monthly_fee, currency, is_active")
    .in("id", groupIds);
  const groups = (groupRows ?? []) as GroupRow[];

  // Keep the calendar generated (idempotent; open members may call it). Errors only mean we show what exists.
  await Promise.all(groupIds.map((g) => supabase.rpc("ensure_group_sessions", { p_group: g })));

  const branchIds = [...new Set(groups.map((g) => g.branch_id))];
  const sportIds = [...new Set(groups.map((g) => g.sport_id).filter((s): s is string => !!s))];
  const coachIds = [...new Set(groups.map((g) => g.coach_id))];
  const from = new Date(Date.now() - 60 * DAY).toISOString();
  const to = new Date(Date.now() + 28 * DAY).toISOString();

  const [{ data: branchRows }, { data: sportRows }, { data: coachRows }, { data: sessionRows }, { data: cycleRows }, billingResults] =
    await Promise.all([
      supabase.from("coach_branches").select("id, name_ar, name_en, address, map_url").in("id", branchIds),
      sportIds.length ? supabase.from("sports").select("id, name_ar, name_en").in("id", sportIds) : Promise.resolve({ data: [] as Named[] }),
      supabase.from("profiles").select("id, display_name").in("id", coachIds),
      supabase
        .from("training_sessions")
        .select("id, group_id, scheduled_at, status, cancel_kind, cancel_reason")
        .in("group_id", groupIds)
        .gte("scheduled_at", from)
        .lte("scheduled_at", to)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("subscription_cycles")
        .select("group_id, status, fee_amount, currency, reject_reason, declared_at")
        .eq("athlete_id", me.id)
        .in("group_id", groupIds)
        .order("declared_at", { ascending: false }),
      Promise.all(groupIds.map((g) => supabase.rpc("member_billing", { p_group: g, p_athlete: me.id }))),
    ]);

  const sessions = (sessionRows ?? []) as (PanelSession & { group_id: string })[];
  const sessionIds = sessions.map((s) => s.id);
  const { data: attRows } = sessionIds.length
    ? await supabase
        .from("session_attendance")
        .select("session_id, status, score, performance, note")
        .eq("athlete_id", me.id)
        .in("session_id", sessionIds)
    : { data: [] as PanelAttendance[] };
  const attendance = (attRows ?? []) as PanelAttendance[];
  const { data: claimRows } = sessionIds.length
    ? await supabase
        .from("attendance_claims")
        .select("session_id, status, message, resolution_note, created_at")
        .eq("athlete_id", me.id)
        .in("session_id", sessionIds)
    : { data: [] as PanelClaim[] };
  const claims = (claimRows ?? []) as PanelClaim[];

  const branchById = new Map(((branchRows ?? []) as BranchRow[]).map((b) => [b.id, b]));
  const sportById = new Map(((sportRows ?? []) as Named[]).map((s) => [s.id, s]));
  const coachById = new Map(((coachRows ?? []) as { id: string; display_name: string | null }[]).map((c) => [c.id, c.display_name]));
  const cycles = (cycleRows ?? []) as (PanelCycle & { group_id: string })[];
  const billingByGroup = new Map<string, PanelBilling | null>();
  groupIds.forEach((g, i) => {
    const row = (billingResults[i]?.data as PanelBilling[] | null)?.[0];
    billingByGroup.set(g, row ?? null);
  });

  const ordered = groupIds.map((id) => groups.find((g) => g.id === id)).filter((g): g is GroupRow => !!g);

  return (
    <div className="space-y-6">
      {intro}
      <div className="space-y-5">
        {ordered.map((g) => {
          const sport = g.sport_id ? sportById.get(g.sport_id) : null;
          const sessionIdsOfGroup = new Set(sessions.filter((s) => s.group_id === g.id).map((s) => s.id));
          return (
            <AthleteGroupPanel
              key={g.id}
              group={g}
              branch={branchById.get(g.branch_id) ?? null}
              sportName={sport ? (loc === "ar" ? sport.name_ar : sport.name_en || sport.name_ar) : null}
              coachName={coachById.get(g.coach_id) ?? null}
              sessions={sessions.filter((s) => s.group_id === g.id)}
              attendance={attendance.filter((a) => sessionIdsOfGroup.has(a.session_id))}
              claims={claims.filter((c) => sessionIdsOfGroup.has(c.session_id))}
              cycles={cycles.filter((c) => c.group_id === g.id).slice(0, 6)}
              windows={allWindows.filter((w) => w.group_id === g.id)}
              billing={billingByGroup.get(g.id) ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
