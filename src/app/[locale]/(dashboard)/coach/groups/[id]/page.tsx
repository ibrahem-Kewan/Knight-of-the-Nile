import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RemoveMemberButton } from "@/components/training/remove-member-button";
import { GroupForm, type BranchOption, type GroupValues, type SportOption } from "@/components/training/group-form";
import { GroupActiveToggle } from "@/components/training/group-active-toggle";
import { SessionRow, type SessionView } from "@/components/training/session-row";
import { GroupSummary } from "@/components/training/group-summary";
import { ClaimActions } from "@/components/training/claim-actions";
import { GroupPayments } from "@/components/training/group-payments";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

type Group = GroupValues & { currency: string; is_active: boolean };

export async function generateMetadata() {
  const t = await getTranslations("training");
  return { title: t("groupDetails") };
}

export default async function CoachGroupDetailsPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const me = await requireRole(["coach"]);
  const t = await getTranslations("training");
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();

  const { data } = await supabase
    .from("training_groups")
    .select("id, branch_id, sport_id, name_ar, name_en, weekdays, start_time, duration_minutes, sessions_per_cycle, monthly_fee, currency, starts_on, is_active")
    .eq("id", id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!data) notFound();
  const group = data as Group;

  const [{ data: branchRows }, { data: sportRows }] = await Promise.all([
    supabase.from("coach_branches").select("id, name_ar, name_en, is_active").eq("coach_id", me.id),
    supabase.from("sports").select("id, name_ar, name_en, is_active").order("name_ar"),
  ]);
  const allBranches = (branchRows ?? []) as (BranchOption & { is_active: boolean })[];
  const allSports = (sportRows ?? []) as (SportOption & { is_active: boolean })[];
  const branch = allBranches.find((b) => b.id === group.branch_id);
  const sport = allSports.find((s) => s.id === group.sport_id);
  // Keep the current branch/sport selectable even if now inactive, so saving never silently changes them.
  const branchOptions = allBranches.filter((b) => b.is_active || b.id === group.branch_id);
  const sportOptions = allSports.filter((s) => s.is_active || s.id === group.sport_id);

  // Keep the calendar in sync with the schedule (idempotent); a failure only means we show what exists.
  await supabase.rpc("ensure_group_sessions", { p_group: id });
  const nowIso = new Date().toISOString();
  type SessionRow_ = {
    id: string;
    scheduled_at: string;
    status: "scheduled" | "cancelled";
    cancel_kind: SessionView["cancelKind"];
    cancel_reason: string | null;
  };
  const sessionCols = "id, scheduled_at, status, cancel_kind, cancel_reason";
  const [{ data: upRows }, { data: pastRows }] = await Promise.all([
    supabase.from("training_sessions").select(sessionCols).eq("group_id", id).gt("scheduled_at", nowIso).order("scheduled_at", { ascending: true }).limit(8),
    supabase.from("training_sessions").select(sessionCols).eq("group_id", id).lte("scheduled_at", nowIso).order("scheduled_at", { ascending: false }).limit(8),
  ]);
  const dateFmt = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" });
  const timeFmt = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Cairo" });
  // Attendance counts: eligible members = membership open at the session time; present = recorded 'present' rows.
  const sessionIds = [...(upRows ?? []), ...(pastRows ?? [])].map((r) => r.id as string);
  const [{ data: allMemberships }, { data: attRows }] = await Promise.all([
    supabase.from("training_group_members").select("joined_at, left_at").eq("group_id", id),
    sessionIds.length
      ? supabase.from("session_attendance").select("session_id, status").in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { session_id: string; status: string }[] }),
  ]);
  const presentBySession = new Map<string, number>();
  for (const a of (attRows ?? []) as { session_id: string; status: string }[]) {
    if (a.status === "present") presentBySession.set(a.session_id, (presentBySession.get(a.session_id) ?? 0) + 1);
  }
  const toView = (r: SessionRow_, past: boolean): SessionView => {
    const at = new Date(r.scheduled_at);
    const atMs = at.getTime();
    const open = r.status === "scheduled" && atMs <= Date.now() + 60 * 60 * 1000;
    const total = ((allMemberships ?? []) as { joined_at: string; left_at: string | null }[]).filter(
      (m) => new Date(m.joined_at).getTime() <= atMs && (!m.left_at || new Date(m.left_at).getTime() > atMs),
    ).length;
    return {
      id: r.id,
      dateLabel: dateFmt.format(at),
      timeLabel: timeFmt.format(at),
      state: r.status === "cancelled" ? "cancelled" : past ? "held" : "upcoming",
      cancelKind: r.cancel_kind,
      editable: Date.now() <= at.getTime() + 7 * 24 * 60 * 60 * 1000,
      cancelReason: r.cancel_reason,
      attendanceHref: open ? `/coach/groups/${id}/sessions/${r.id}` : null,
      attendanceReadOnly: open && Date.now() > atMs + 7 * 24 * 60 * 60 * 1000,
      counts: open ? { present: presentBySession.get(r.id) ?? 0, total } : null,
    };
  };
  const upcoming = ((upRows ?? []) as SessionRow_[]).map((r) => toView(r, false));
  const recent = ((pastRows ?? []) as SessionRow_[]).map((r) => toView(r, true));

  const { data: memberRows } = await supabase
    .from("training_group_members")
    .select("id, athlete_id, joined_at")
    .eq("group_id", id)
    .is("left_at", null)
    .order("joined_at", { ascending: true });
  const memberships = (memberRows ?? []) as { id: string; athlete_id: string; joined_at: string }[];
  const { data: memberProfiles } = memberships.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, phone")
        .in("id", memberships.map((m) => m.athlete_id))
    : { data: [] as { id: string; display_name: string | null; email: string | null; phone: string | null }[] };
  const profileById = new Map((memberProfiles ?? []).map((p) => [p.id, p]));
  const joinedFmt = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", { dateStyle: "medium", timeZone: "Africa/Cairo" });

  // Open attendance claims of this group (athlete + session + what is currently recorded).
  type ClaimRow = {
    id: string;
    session_id: string;
    athlete_id: string;
    message: string | null;
    created_at: string;
    training_sessions: { scheduled_at: string } | { scheduled_at: string }[] | null;
  };
  const { data: claimData } = await supabase
    .from("attendance_claims")
    .select("id, session_id, athlete_id, message, created_at, training_sessions!inner(group_id, scheduled_at)")
    .eq("status", "open")
    .eq("training_sessions.group_id", id)
    .order("created_at", { ascending: true });
  const claimRows = (claimData ?? []) as unknown as ClaimRow[];
  const claimAthleteIds = [...new Set(claimRows.map((c) => c.athlete_id))];
  const claimSessionIds = [...new Set(claimRows.map((c) => c.session_id))];
  const [{ data: claimProfiles }, { data: claimAtt }] = claimRows.length
    ? await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", claimAthleteIds),
        supabase.from("session_attendance").select("session_id, athlete_id, status").in("session_id", claimSessionIds).in("athlete_id", claimAthleteIds),
      ])
    : [{ data: [] as { id: string; display_name: string | null }[] }, { data: [] as { session_id: string; athlete_id: string; status: string }[] }];
  const claimNameById = new Map((claimProfiles ?? []).map((p) => [p.id as string, p.display_name as string | null]));
  const claimAttStatus = new Map(
    ((claimAtt ?? []) as { session_id: string; athlete_id: string; status: string }[]).map((a) => [`${a.session_id}:${a.athlete_id}`, a.status]),
  );
  const claimDateFmt = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Cairo",
  });

  const startsOn = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${group.starts_on}T00:00:00Z`));
  const Back = ar ? ChevronRight : ChevronLeft;

  return (
    <div className="space-y-6">
      <Link
        href="/coach/groups"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold"
      >
        <Back className="h-4 w-4" aria-hidden /> {t("backToGroups")}
      </Link>

      {/* Header card. Later stories append further <section>s below (members, sessions, payments, claims). */}
      <section className="min-w-0 space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="group-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 id="group-title" className="min-w-0 break-words font-display text-2xl text-gold">
            {ar ? group.name_ar : group.name_en || group.name_ar}
          </h1>
          <Badge variant={group.is_active ? "success" : "outline"}>{group.is_active ? t("active") : t("inactive")}</Badge>
        </div>
        <div className="min-w-0 space-y-1.5 text-sm text-muted-foreground">
          {branch && (
            <p className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="break-words">{ar ? branch.name_ar : branch.name_en || branch.name_ar}</span>
            </p>
          )}
          {sport && <p>{t("sport")}: {ar ? sport.name_ar : sport.name_en}</p>}
          <p>{t("startsOn")}: {startsOn}</p>
        </div>
        <GroupSummary g={group} />
        <div className="flex flex-wrap items-start gap-2 pt-1">
          <GroupActiveToggle id={group.id} active={group.is_active} />
          <GroupForm branches={branchOptions} sports={sportOptions} group={group} />
        </div>
      </section>

      <section className="min-w-0 space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="group-members">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="group-members" className="text-lg font-semibold">
            {t("members")} <span className="text-sm font-normal text-muted-foreground">({memberships.length})</span>
          </h2>
          <Link
            href="/coach/athletes"
            className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-11" })}
          >
            {t("addMembers")}
          </Link>
        </div>
        {!memberships.length ? (
          <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
        ) : (
          <ul className="grid min-w-0 gap-2 md:grid-cols-2">
            {memberships.map((m) => {
              const p = profileById.get(m.athlete_id);
              const name = p?.display_name ?? "—";
              return (
                <li key={m.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{name}</p>
                    <p className="break-all text-xs text-muted-foreground">{p?.email ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("joinedOn", { date: joinedFmt.format(new Date(m.joined_at)) })}
                    </p>
                  </div>
                  <RemoveMemberButton membershipId={m.id} label={`${name}`} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="min-w-0 space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="group-sessions">
        <h2 id="group-sessions" className="text-lg font-semibold">{t("sessions")}</h2>
        {!upcoming.length && !recent.length ? (
          <p className="text-sm text-muted-foreground">{t("noSessions")}</p>
        ) : (
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{t("upcoming")}</h3>
              {upcoming.length ? (
                <ul className="space-y-2">{upcoming.map((s) => <SessionRow key={s.id} s={s} />)}</ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noSessions")}</p>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{t("past")}</h3>
              {recent.length ? (
                <ul className="space-y-2">{recent.map((s) => <SessionRow key={s.id} s={s} />)}</ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noSessions")}</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section id="group-claims" className="min-w-0 scroll-mt-4 space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="group-claims-title">
        <h2 id="group-claims-title" className="text-lg font-semibold">
          {t("claims")} <span className="text-sm font-normal text-muted-foreground">({claimRows.length})</span>
        </h2>
        {!claimRows.length ? (
          <p className="text-sm text-muted-foreground">{t("noClaims")}</p>
        ) : (
          <ul className="grid min-w-0 gap-2 lg:grid-cols-2">
            {claimRows.map((c) => {
              const ts = Array.isArray(c.training_sessions) ? c.training_sessions[0] : c.training_sessions;
              const name = claimNameById.get(c.athlete_id) ?? "—";
              const deadline = new Date(c.created_at).getTime() + 7 * 24 * 60 * 60 * 1000;
              const canAccept = Date.now() <= deadline;
              const cur = claimAttStatus.get(`${c.session_id}:${c.athlete_id}`);
              return (
                <li key={c.id} className="min-w-0 space-y-2 rounded-md border border-border p-3">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{name}</p>
                      <p className="break-words text-sm text-muted-foreground">{ts ? claimDateFmt.format(new Date(ts.scheduled_at)) : "—"}</p>
                    </div>
                    <Badge variant={cur === "absent" ? "danger" : cur === "present" ? "success" : "outline"}>{cur === "absent" ? t("absent") : cur === "present" ? t("present") : t("notRecorded")}</Badge>
                  </div>
                  {c.message && <p className="break-words text-sm">{c.message}</p>}
                  <p className="text-xs text-muted-foreground">{t("claimRespondBy", { date: claimDateFmt.format(new Date(deadline)) })}</p>
                  <ClaimActions claimId={c.id} athleteName={name} canAccept={canAccept} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <GroupPayments
        groupId={group.id}
        fee={Number(group.monthly_fee)}
        currency={group.currency}
        sessionsPerCycle={group.sessions_per_cycle}
        members={memberships.map((m) => ({ id: m.athlete_id, name: profileById.get(m.athlete_id)?.display_name ?? "—" }))}
      />
    </div>
  );
}
