import { Star, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ClaimButton } from "@/components/training/claim-button";
import { DeclarePaymentForm } from "@/components/training/declare-payment-form";
import { formatMoney, formatSchedule } from "@/lib/training/schedule";

export type PanelBilling = {
  paid_sessions: number;
  consumed_sessions: number;
  remaining_sessions: number;
  unpaid_consumed: number;
  is_due: boolean;
  last_covered_at: string | null;
};

export type PanelCycle = {
  status: "declared" | "confirmed" | "rejected" | "void";
  fee_amount: number | null;
  currency: string;
  reject_reason: string | null;
  declared_at: string;
};

export type PanelSession = {
  id: string;
  scheduled_at: string;
  status: "scheduled" | "cancelled";
  cancel_kind: "holiday" | "coach_absent" | "other" | null;
  cancel_reason: string | null;
};

export type PanelAttendance = {
  session_id: string;
  status: "present" | "absent";
  score: number | null;
  performance: number | null;
  note: string | null;
};

export type PanelClaim = {
  session_id: string;
  status: "open" | "accepted" | "rejected";
  message: string | null;
  resolution_note: string | null;
  /** Newest first when several claims exist for one session. */
  created_at: string;
};

export type PanelGroup = {
  id: string;
  name_ar: string;
  name_en: string | null;
  weekdays: number[];
  start_time: string;
  duration_minutes: number;
  sessions_per_cycle: number;
  monthly_fee: number;
  currency: string;
  is_active: boolean;
};

export type MembershipWindow = { joined_at: string; left_at: string | null };

export type PanelBranch = { name_ar: string; name_en: string | null; address: string | null; map_url: string | null } | null;

const UPCOMING_LIMIT = 4;
const HISTORY_LIMIT = 8;
const KIND_KEY = { holiday: "holiday", coach_absent: "coachAbsent", other: "otherReason" } as const;

/** Whether the athlete's group needs a payment (used by the overview card too). */
export function isDueState(b: PanelBilling | null): boolean {
  return !!b && b.is_due;
}

export async function AthleteGroupPanel({
  group,
  branch,
  sportName,
  coachName,
  sessions,
  attendance,
  claims,
  cycles,
  billing,
  windows,
}: {
  group: PanelGroup;
  branch: PanelBranch;
  sportName: string | null;
  coachName: string | null;
  sessions: PanelSession[];
  attendance: PanelAttendance[];
  /** My attendance claims for these sessions. */
  claims: PanelClaim[];
  /** Newest first. */
  cycles: PanelCycle[];
  billing: PanelBilling | null;
  /** All my membership windows in this group; only sessions inside one of them are shown. */
  windows: MembershipWindow[];
}) {
  const t = await getTranslations("training");
  const locale = await getLocale();
  const ar = locale === "ar";
  const tag = ar ? "ar-EG" : "en-GB";
  const dateFmt = new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Cairo" });
  const timeFmt = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", hour12: ar, timeZone: "Africa/Cairo" });

  const now = Date.now();
  const inWindow = (iso: string) => {
    const at = new Date(iso).getTime();
    return windows.some((w) => new Date(w.joined_at).getTime() <= at && (!w.left_at || at < new Date(w.left_at).getTime()));
  };
  const sorted = sessions.filter((s) => inWindow(s.scheduled_at)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const upcoming = sorted.filter((s) => new Date(s.scheduled_at).getTime() > now).slice(0, UPCOMING_LIMIT);
  const pastDesc = sorted.filter((s) => new Date(s.scheduled_at).getTime() <= now).reverse();
  const history: PanelSession[] = [];
  let held = 0;
  for (const s of pastDesc) {
    if (s.status !== "cancelled") {
      if (held >= HISTORY_LIMIT) break;
      held += 1;
    }
    history.push(s);
  }
  const attBySession = new Map(attendance.map((a) => [a.session_id, a]));
  const claimBySession = new Map<string, PanelClaim>();
  for (const c of [...claims].sort((x, y) => y.created_at.localeCompare(x.created_at))) {
    if (!claimBySession.has(c.session_id)) claimBySession.set(c.session_id, c);
  }
  const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  const name = ar ? group.name_ar : group.name_en || group.name_ar;
  const branchName = branch ? (ar ? branch.name_ar : branch.name_en || branch.name_ar) : null;
  const money = (n: number, cur: string) => formatMoney(n, cur, locale);

  const openDeclaration = cycles.find((c) => c.status === "declared") ?? null;
  const lastRejected = !openDeclaration && cycles[0]?.status === "rejected" ? cycles[0] : null;
  const due = !!billing && billing.is_due;
  const neverPaid = !!billing && billing.paid_sessions === 0 && billing.unpaid_consumed === 0;
  const showForm = group.is_active && due && !openDeclaration;
  const showEarly = group.is_active && !due && !openDeclaration && !!billing && billing.remaining_sessions <= 2;

  const sessionLabel = (s: PanelSession) => {
    const at = new Date(s.scheduled_at);
    return `${dateFmt.format(at)} · ${timeFmt.format(at)}`;
  };

  return (
    <section className="min-w-0 space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby={`g-${group.id}`}>
      {/* Header */}
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id={`g-${group.id}`} className="min-w-0 break-words font-display text-xl text-gold">{name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {!group.is_active && <Badge variant="warning">{t("groupPaused")}</Badge>}
            {sportName && <Badge variant="outline">{sportName}</Badge>}
          </div>
        </div>
        <dl className="grid min-w-0 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{t("scheduleLabel")}</dt>
            <dd className="break-words">
              {formatSchedule(group.weekdays, group.start_time, group.duration_minutes, locale)} · {group.duration_minutes} {t("minutes")}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{t("coachLabel")}</dt>
            <dd className="break-words">{coachName ?? "—"}</dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("branchLabel")}</dt>
            <dd className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
              <span className="min-w-0 break-words">
                {branchName ?? "—"}
                {branch?.address ? ` — ${branch.address}` : ""}
              </span>
              {branch?.map_url && (
                <a
                  href={branch.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-gold-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold"
                >
                  <MapPin className="h-4 w-4" aria-hidden /> {t("openMap")}
                </a>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Subscription */}
      <div className="min-w-0 space-y-2 rounded-md border border-border p-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("subscriptionStatus")}</h3>
          {openDeclaration ? (
            <Badge variant="warning">{t("awaitingConfirmation")}</Badge>
          ) : billing ? (
            <Badge variant={!due ? "success" : billing.unpaid_consumed > 0 ? "danger" : "warning"}>
              {due ? (neverPaid ? t("notSubscribedYouYet") : t("due")) : t("paid")}
            </Badge>
          ) : null}
        </div>
        {billing && (
          <p className="text-sm">
            {!due
              ? t("remainingSessions", { count: billing.remaining_sessions })
              : billing.unpaid_consumed > 0
                ? t("youOweSessions", { count: billing.unpaid_consumed })
                : neverPaid
                  ? t("payFee", { amount: money(group.monthly_fee, group.currency) })
                  : t("noRemaining")}
          </p>
        )}
        {openDeclaration && (
          <p className="text-sm text-muted-foreground">
            {t("awaitingAmount", { amount: money(openDeclaration.fee_amount ?? group.monthly_fee, openDeclaration.currency || group.currency) })}
          </p>
        )}
        {lastRejected && (
          <p role="status" className="break-words text-sm text-danger">
            {t("rejectedBecause", { reason: lastRejected.reject_reason ?? "—" })}
          </p>
        )}
        {showEarly && (
          <details className="group/renew pt-1">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold">
              {t("renewEarly")}
            </summary>
            <div className="space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">{t("payFee", { amount: money(group.monthly_fee, group.currency) })}</p>
              <DeclarePaymentForm groupId={group.id} hasOpenDeclaration={false} />
            </div>
          </details>
        )}
        {showForm && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">{t("payNow")} · {money(group.monthly_fee, group.currency)}</p>
            <DeclarePaymentForm groupId={group.id} hasOpenDeclaration={false} />
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("upcomingSessions")}</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noUpcomingSessions")}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <li key={s.id} className="min-w-0 rounded-md border border-border p-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-words text-sm font-medium">{sessionLabel(s)}</span>
                  {s.status === "cancelled" && s.cancel_kind && (
                    <Badge variant={s.cancel_kind === "holiday" ? "warning" : "danger"}>{t(KIND_KEY[s.cancel_kind])}</Badge>
                  )}
                </div>
                {s.status === "cancelled" && s.cancel_reason && (
                  <p className="mt-1 break-words text-xs text-muted-foreground">{s.cancel_reason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* History */}
      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("sessionHistory")}</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSessionHistory")}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((s) => {
              const a = attBySession.get(s.id);
              const claim = claimBySession.get(s.id);
              const canClaim =
                s.status === "scheduled" &&
                now - new Date(s.scheduled_at).getTime() <= CLAIM_WINDOW_MS &&
                a?.status !== "present" &&
                claim?.status !== "open" &&
                !claims.some((c) => c.session_id === s.id && c.status === "rejected");
              if (s.status === "cancelled") {
                return (
                  <li key={s.id} className="min-w-0 rounded-md border border-dashed border-border p-3">
                    <p className="break-words text-sm font-medium">{sessionLabel(s)}</p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {t("cancelledNotCounted", { kind: s.cancel_kind ? t(KIND_KEY[s.cancel_kind]) : t("cancelled") })}
                      {s.cancel_reason ? ` · ${s.cancel_reason}` : ""}
                    </p>
                  </li>
                );
              }
              return (
                <li key={s.id} className="min-w-0 space-y-1.5 rounded-md border border-border p-3">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-medium">{sessionLabel(s)}</span>
                    {a ? (
                      <Badge variant={a.status === "present" ? "success" : "danger"}>
                        {a.status === "present" ? t("present") : t("absent")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("notRecorded")}</Badge>
                    )}
                  </div>
                  {a && (a.score !== null || a.performance !== null) && (
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {a.score !== null && (
                        <span>
                          <span className="text-muted-foreground">{t("yourScore")}: </span>
                          <span className="font-medium">{new Intl.NumberFormat(tag).format(a.score)}</span>
                        </span>
                      )}
                      {a.performance !== null && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-muted-foreground">{t("yourPerformance")}:</span>
                          <span role="img" aria-label={t("starsLabel", { n: a.performance })} className="inline-flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                aria-hidden
                                className={`h-4 w-4 ${n <= (a.performance ?? 0) ? "fill-gold text-gold" : "text-muted-foreground"}`}
                              />
                            ))}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  {a?.note && (
                    <p className="break-words text-xs text-muted-foreground">
                      {t("coachNote")}: {a.note}
                    </p>
                  )}
                  {claim && (
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <Badge variant={claim.status === "open" ? "warning" : claim.status === "accepted" ? "success" : "danger"}>
                        {claim.status === "open" ? t("claimOpen") : claim.status === "accepted" ? t("claimAccepted") : t("claimRejected")}
                      </Badge>
                      {claim.status === "rejected" && claim.resolution_note && (
                        <span className="min-w-0 break-words text-muted-foreground">
                          {t("reason")}: {claim.resolution_note}
                        </span>
                      )}
                    </div>
                  )}
                  {canClaim && (
                    <div className="flex min-w-0 flex-wrap gap-2">
                      <ClaimButton sessionId={s.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
