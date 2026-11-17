"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setMemberTerms } from "@/server/actions/training-payments";
import { effectiveFee, normalizeNumber, type MemberTerms, type PriceMode } from "@/lib/training/terms";
import { formatMoney } from "@/lib/training/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLS =
  "h-11 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

const MODE_KEY = { group: "modeGroup", fixed: "modeFixed", percent: "modePercent", amount: "modeAmount" } as const;

/** Coach sets a member's special price / sessions with a mandatory reason; shows the effective price live. */
export function MemberTermsEditor({
  membershipId,
  groupFee,
  currency,
  groupSessions,
  current,
  ariaLabel,
}: {
  membershipId: string;
  groupFee: number;
  currency: string;
  groupSessions: number;
  current: MemberTerms;
  ariaLabel?: string;
}) {
  const t = useTranslations("training");
  const locale = useLocale();
  const uid = useId();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initDirection = current.value !== null && current.value > 0 ? "increase" : "discount";
  const initValue = current.mode !== "group" && current.value !== null ? String(Math.abs(current.value)) : "";
  const [mode, setMode] = useState<PriceMode>(current.mode);
  const [direction, setDirection] = useState<"discount" | "increase">(initDirection);
  const [value, setValue] = useState(initValue);
  const [sessions, setSessions] = useState(current.sessions === null ? "" : String(current.sessions));

  const reset = () => {
    setMode(current.mode);
    setDirection(initDirection);
    setValue(initValue);
    setSessions(current.sessions === null ? "" : String(current.sessions));
    setErr(null);
  };

  // Live preview of the effective price (the DB recomputes the real value on save).
  const num = Number(normalizeNumber(value));
  const valueOk = mode === "group" || (normalizeNumber(value) !== "" && Number.isFinite(num) && num >= 0);
  const signed = mode === "group" ? null : mode === "fixed" ? num : direction === "discount" ? -num : num;
  const sRaw = normalizeNumber(sessions);
  const sessionsNum = sRaw !== "" && /^\d{1,2}$/.test(sRaw) && Number(sRaw) >= 1 ? Number(sRaw) : groupSessions;
  const preview = valueOk
    ? t("effectivePreview", { amount: formatMoney(effectiveFee(groupFee, mode, signed), currency, locale), count: sessionsNum })
    : "—";

  if (!open) {
    return (
      <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          aria-label={ariaLabel}
          onClick={() => {
            reset();
            setSaved(false);
            setOpen(true);
          }}
        >
          {t("memberTerms")}
        </Button>
        {saved && <span role="status" className="text-sm text-success">{t("termsSaved")}</span>}
      </span>
    );
  }

  return (
    <form
      className="grid min-w-0 basis-full gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setErr(null);
          const res = await setMemberTerms(membershipId, fd);
          if (res?.ok) {
            setOpen(false);
            setSaved(true);
          } else setErr(res?.error ?? "errGeneric");
        });
      }}
    >
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${uid}-m`}>{t("priceMode")}</Label>
        <select id={`${uid}-m`} name="price_mode" value={mode} onChange={(e) => setMode(e.target.value as PriceMode)} className={SELECT_CLS}>
          {(Object.keys(MODE_KEY) as PriceMode[]).map((k) => (
            <option key={k} value={k}>{t(MODE_KEY[k])}</option>
          ))}
        </select>
      </div>

      {(mode === "percent" || mode === "amount") && (
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${uid}-dir`}>{t("direction")}</Label>
          <select
            id={`${uid}-dir`}
            name="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "discount" | "increase")}
            className={SELECT_CLS}
          >
            <option value="discount">{t("discount")}</option>
            <option value="increase">{t("increase")}</option>
          </select>
        </div>
      )}

      {mode !== "group" && (
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${uid}-v`}>{mode === "percent" ? t("termsValuePercent") : t("termsValueAmount")}</Label>
          <Input
            id={`${uid}-v`}
            name="value"
            inputMode="decimal"
            dir="ltr"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-11"
          />
        </div>
      )}

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${uid}-s`}>{t("sessionsOverride")}</Label>
        <Input
          id={`${uid}-s`}
          name="sessions"
          type="number"
          min={1}
          max={31}
          dir="ltr"
          placeholder={String(groupSessions)}
          value={sessions}
          onChange={(e) => setSessions(e.target.value)}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">{t("sessionsOverrideHint", { count: groupSessions })}</p>
      </div>

      <div className="min-w-0 space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${uid}-r`}>{t("termsReason")}</Label>
        <Input id={`${uid}-r`} name="reason" required minLength={3} maxLength={300} className="h-11" />
      </div>

      <p aria-live="polite" className="min-w-0 break-words text-sm font-medium sm:col-span-2">{preview}</p>

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <Button type="submit" size="sm" className="min-h-11" disabled={pending}>
          {t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          {t("cancel")}
        </Button>
        {err && <p role="alert" className="min-w-0 break-words text-sm text-danger">{t.has(err) ? t(err) : t("errGeneric")}</p>}
      </div>
    </form>
  );
}
