import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ConfirmRejectButtons, RecordPaymentForm, VoidButton } from "@/components/training/payment-actions";
import { StartDateEditor } from "@/components/training/start-date-editor";
import { MemberTermsEditor } from "@/components/training/member-terms-editor";
import type { PriceMode } from "@/lib/training/terms";
import { cairoToday, formatYmd } from "@/lib/training/dates";

type Billing = {
  athlete_id: string;
  is_member: boolean;
  paid_sessions: number;
  consumed_sessions: number;
  remaining_sessions: number;
  unpaid_consumed: number;
  is_due: boolean;
  last_covered_at: string | null;
};

type MemberTermsRow = {
  athlete_id: string;
  membership_id: string;
  price_mode: PriceMode;
  price_value: number | null;
  sessions_override: number | null;
  fee_amount: number;
  currency: string;
  sessions_total: number;
  reason: string | null;
  set_by: string | null;
  set_at: string | null;
};

type Cycle = {
  id: string;
  athlete_id: string;
  status: "declared" | "confirmed" | "rejected" | "void";
  method: "instapay" | "cash" | "other";
  payment_ref: string | null;
  note: string | null;
  fee_amount: number | null;
  currency: string;
  sessions_total: number | null;
  declared_by: string;
  declared_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  reject_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

const HISTORY_LIMIT = 100;
const STATUS_KEY = { declared: "statusDeclared", confirmed: "statusConfirmed", rejected: "statusRejected", void: "statusVoid" } as const;
const STATUS_VARIANT = { declared: "warning", confirmed: "success", rejected: "danger", void: "outline" } as const;
const METHOD_KEY = { instapay: "instapay", cash: "cash", other: "other" } as const;

/**
 * Payments section of the coach group page. The page has already called ensure_group_sessions for this group,
 * so group_billing sees the generated calendar. Writes happen only through the payment server actions.
 */
export async function GroupPayments({
  groupId,
  fee,
  currency,
  sessionsPerCycle,
  members,
}: {
  groupId: string;
  fee: number;
  currency: string;
  sessionsPerCycle: number;
  /** Open members only. Former members who still owe are derived from group_billing. */
  members: { id: string; name: string }[];
}) {
  const t = await getTranslations("training");
  const locale = await getLocale();
  const ar = locale === "ar";
  const supabase = await createClient();

  const [{ data: billingRows }, { data: cycleRows }, { data: memberRows, error: memberErr }, { data: groupRow, error: groupErr }, { data: termsRows, error: termsErr }] = await Promise.all([
    supabase.rpc("group_billing", { p_group: groupId }),
    supabase
      .from("subscription_cycles")
      .select(
        "id, athlete_id, status, method, payment_ref, note, fee_amount, currency, sessions_total, declared_by, declared_at, confirmed_by, confirmed_at, rejected_by, rejected_at, reject_reason, voided_by, voided_at, void_reason",
      )
      .eq("group_id", groupId)
      .order("declared_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    // select("*"): before migration 0044 there is no start_date column and an explicit list would fail.
    supabase.from("training_group_members").select("*").eq("group_id", groupId).is("left_at", null),
    supabase.from("training_groups").select("starts_on").eq("id", groupId).maybeSingle(),
    supabase.rpc("group_member_terms", { p_group: groupId }),
  ]);
  // Before migration 0045 the rpc is missing: members then fall back to group terms in the UI (the DB still snapshots correctly).
  if (termsErr) console.error("[group-payments] group_member_terms failed", { code: termsErr.code, message: termsErr.message });
  const termsByAthlete = new Map<string, MemberTermsRow>(
    ((termsErr ? [] : termsRows ?? []) as MemberTermsRow[]).map((r) => [r.athlete_id, r]),
  );
  if (memberErr) console.error("[group-payments] memberships query failed", { code: memberErr.code, message: memberErr.message });
  if (groupErr) console.error("[group-payments] group query failed", { code: groupErr.code, message: groupErr.message });
  const membershipByAthlete = new Map<string, { id: string; start_date?: string | null }>(
    ((memberRows ?? []) as { id: string; athlete_id: string; start_date?: string | null }[]).map((r) => [r.athlete_id, r]),
  );
  const startsOn = (groupRow as { starts_on: string } | null)?.starts_on ?? null;
  const today = cairoToday();
  const billingList = (billingRows ?? []) as Billing[];
  const billing = new Map(billingList.map((b) => [b.athlete_id, b]));
  const cycles = (cycleRows ?? []) as Cycle[];
  const formerIds = billingList.filter((b) => !b.is_member).map((b) => b.athlete_id);

  // Names: members are known; other people (athletes who left, admins) are fetched in one extra query.
  const names = new Map(members.map((m) => [m.id, m.name]));
  const missing = [...new Set([...formerIds, ...cycles.flatMap((c) => [c.athlete_id, c.declared_by, c.confirmed_by, c.rejected_by, c.voided_by])])].filter(
    (id): id is string => !!id && !names.has(id),
  );
  if (missing.length) {
    const { data: ps } = await supabase.from("profiles").select("id, display_name").in("id", missing);
    for (const p of (ps ?? []) as { id: string; display_name: string | null }[]) names.set(p.id, p.display_name ?? "—");
  }
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? "—") : "—");

  const tag = ar ? "ar-EG" : "en-GB";
  const money = (amount: number | null, cur: string) =>
    amount === null ? "—" : new Intl.NumberFormat(tag, { style: "currency", currency: cur.trim() || "EGP" }).format(amount);
  const dayFmt = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeZone: "Africa/Cairo" });
  const dateTimeFmt = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" });

  const pendingCycles = cycles.filter((c) => c.status === "declared");
  const memberTermLabel = (id: string) => {
    const r = termsByAthlete.get(id);
    return r ? t("specialTermsShort", { amount: money(Number(r.fee_amount), r.currency), count: r.sessions_total }) : undefined;
  };
  const formerMembers = formerIds.map((id) => ({ id, name: nameOf(id) }));
  const payable = [...members.map((m) => ({ ...m, amountLabel: memberTermLabel(m.id) })), ...formerMembers];
  const pendingByAthlete = new Set(pendingCycles.map((c) => c.athlete_id));

  const renderMember = (m: { id: string; name: string }) => {
    const b = billing.get(m.id);
    const neverPaid = !!b && b.paid_sessions === 0 && b.unpaid_consumed === 0;
    const ms = b?.is_member === false ? undefined : membershipByAthlete.get(m.id);
    const terms = ms ? termsByAthlete.get(m.id) : undefined;
    const isSpecial = !!terms && (terms.price_mode !== "group" || terms.sessions_override !== null);
    const pv = terms?.price_value === null || terms?.price_value === undefined ? 0 : Number(terms.price_value);
    const kind =
      terms?.price_mode === "fixed"
        ? t("termsFixed")
        : terms?.price_mode === "percent"
          ? t(pv < 0 ? "termsDiscountPercent" : "termsIncreasePercent", { value: new Intl.NumberFormat(tag).format(Math.abs(pv)) })
          : terms?.price_mode === "amount"
            ? t(pv < 0 ? "termsDiscountAmount" : "termsIncreaseAmount", { amount: money(Math.abs(pv), terms.currency) })
            : null;
    return (
      <li key={m.id} className="min-w-0 space-y-1.5 rounded-md border border-border p-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 break-words font-medium">{m.name}</p>
          {b && (
            <Badge variant={!b.is_due ? "success" : b.unpaid_consumed > 0 ? "danger" : "warning"}>
              {b.is_due ? t("due") : t("paid")}
            </Badge>
          )}
        </div>
        {ms?.start_date && (
          <p className="text-xs text-muted-foreground">{t("startsFrom", { date: formatYmd(ms.start_date, locale) })}</p>
        )}
        {isSpecial && terms && (
          <>
            <Badge variant="default">
              {t("specialTerms", { amount: money(Number(terms.fee_amount), terms.currency), count: terms.sessions_total })}
            </Badge>
            {(kind || terms.reason) && (
              <p className="break-words text-xs text-muted-foreground">
                {kind}
                {kind && terms.reason ? " · " : ""}
                {terms.reason ? `${t("reason")}: ${terms.reason}` : ""}
              </p>
            )}
          </>
        )}
        {ms && (
          <div className="flex flex-wrap gap-2 pt-1">
            {ms.start_date && <StartDateEditor membershipId={ms.id} current={ms.start_date} today={today} groupStartsOn={startsOn} ariaLabel={t("editStartDateOf", { name: m.name })} />}
            {!termsErr && (
              <MemberTermsEditor
                membershipId={terms?.membership_id ?? ms.id}
                groupFee={fee}
                currency={currency}
                groupSessions={sessionsPerCycle}
                ariaLabel={t("memberTermsOf", { name: m.name })}
                current={{ mode: terms?.price_mode ?? "group", value: terms?.price_value ?? null, sessions: terms?.sessions_override ?? null }}
              />
            )}
          </div>
        )}
        {b && (
          <p className="text-sm">
            {!b.is_due
              ? t("remainingSessions", { count: b.remaining_sessions })
              : b.unpaid_consumed > 0
                ? t("owesSessions", { count: b.unpaid_consumed })
                : neverPaid
                  ? t("notSubscribedYet")
                  : t("noRemaining")}
          </p>
        )}
        {b?.last_covered_at && (
          <p className="text-xs text-muted-foreground">{t("coveredUntil", { date: dayFmt.format(new Date(b.last_covered_at)) })}</p>
        )}
        {pendingByAthlete.has(m.id) && <Badge variant="warning">{t("pendingConfirmation")}</Badge>}
      </li>
    );
  };

  return (
    <section className="min-w-0 space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="group-payments">
      <div className="space-y-1">
        <h2 id="group-payments" className="text-lg font-semibold">{t("payments")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("subscriptionTerms", { amount: money(fee, currency), count: sessionsPerCycle })}
        </p>
      </div>

      {/* Per-member status */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("subscription")}</h3>
        {!members.length ? (
          <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
        ) : (
          <ul className="grid min-w-0 gap-2 md:grid-cols-2">
            {members.map((m) => renderMember(m))}
          </ul>
        )}
      </div>

      {formerMembers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("formerMembersWithBalance")}</h3>
          <ul className="grid min-w-0 gap-2 md:grid-cols-2">{formerMembers.map((m) => renderMember(m))}</ul>
        </div>
      )}

      {/* Pending declarations */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t("pendingConfirmation")} <span className="font-normal">({pendingCycles.length})</span>
        </h3>
        {!pendingCycles.length ? (
          <p className="text-sm text-muted-foreground">{t("noPending")}</p>
        ) : (
          <ul className="space-y-2">
            {pendingCycles.map((c) => (
              <li key={c.id} className="min-w-0 space-y-2 rounded-md border border-border p-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words font-medium">{nameOf(c.athlete_id)}</p>
                  <p className="text-xs text-muted-foreground">{dateTimeFmt.format(new Date(c.declared_at))}</p>
                </div>
                <p className="break-words text-sm text-muted-foreground">
                  {t(METHOD_KEY[c.method])}
                  {c.payment_ref ? ` · ${t("paymentRef")}: ` : ""}
                  {c.payment_ref && <bdi dir="ltr">{c.payment_ref}</bdi>}
                </p>
                {c.note && <p className="break-words text-sm text-muted-foreground">{t("note")}: {c.note}</p>}
                <p className="text-sm">
                  <span className="font-medium">{money(c.fee_amount, c.currency)}</span>
                  <span className="text-muted-foreground"> · {t("sessionsLabel")}: {c.sessions_total ?? "—"}</span>
                </p>
                <ConfirmRejectButtons cycleId={c.id} amountLabel={money(c.fee_amount, c.currency)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Record a payment */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("recordPayment")}</h3>
        <RecordPaymentForm groupId={groupId} members={payable} />
      </div>

      {/* History: append-only ledger */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("history")}</h3>
        {!cycles.length ? (
          <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
        ) : (
          <ul className="space-y-2">
            {cycles.map((c) => (
              <li key={c.id} className="min-w-0 space-y-1.5 rounded-md border border-border p-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words font-medium">{nameOf(c.athlete_id)}</p>
                  <Badge variant={STATUS_VARIANT[c.status]}>{t(STATUS_KEY[c.status])}</Badge>
                </div>
                <dl className="grid min-w-0 gap-x-4 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("amount")}</dt>
                    <dd className="font-medium">{money(c.fee_amount, c.currency)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("sessionsLabel")}</dt>
                    <dd>{c.sessions_total ?? "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("method")}</dt>
                    <dd className="break-words">
                      {t(METHOD_KEY[c.method])}
                      {c.payment_ref && <> · <bdi dir="ltr">{c.payment_ref}</bdi></>}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("declaredBy")}</dt>
                    <dd className="break-words">{nameOf(c.declared_by)} · {dateTimeFmt.format(new Date(c.declared_at))}</dd>
                  </div>
                  {c.confirmed_at && (
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{t("confirmedBy")}</dt>
                      <dd className="break-words">{nameOf(c.confirmed_by)} · {dateTimeFmt.format(new Date(c.confirmed_at))}</dd>
                    </div>
                  )}
                  {c.rejected_at && (
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{t("rejectedBy")}</dt>
                      <dd className="break-words">{nameOf(c.rejected_by)} · {dateTimeFmt.format(new Date(c.rejected_at))}</dd>
                    </div>
                  )}
                  {c.voided_at && (
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{t("voidedBy")}</dt>
                      <dd className="break-words">{nameOf(c.voided_by)} · {dateTimeFmt.format(new Date(c.voided_at))}</dd>
                    </div>
                  )}
                </dl>
                {c.note && <p className="break-words text-xs text-muted-foreground">{t("note")}: {c.note}</p>}
                {c.reject_reason && <p className="break-words text-sm text-danger">{t("rejectReason")}: {c.reject_reason}</p>}
                {c.void_reason && <p className="break-words text-sm text-muted-foreground">{t("voidReason")}: {c.void_reason}</p>}
                {c.status === "confirmed" && (
                  <div className="flex flex-wrap items-start gap-2 pt-1">
                    <VoidButton cycleId={c.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {cycles.length >= HISTORY_LIMIT && <p className="text-xs text-muted-foreground">{t("historyCapped", { count: HISTORY_LIMIT })}</p>}
      </div>
    </section>
  );
}
