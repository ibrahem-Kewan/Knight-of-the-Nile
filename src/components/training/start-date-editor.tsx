"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { previewMemberStartDate, setMemberStartDate, type StartPreview } from "@/server/actions/training";
import { isYmd, startBounds } from "@/lib/training/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Changes a membership's start day with a mandatory reason and a read-only preview of the balance effect. */
export function StartDateEditor({
  membershipId,
  current,
  today,
  groupStartsOn,
  label,
  ariaLabel,
}: {
  membershipId: string;
  current: string;
  today: string;
  groupStartsOn?: string | null;
  label?: string;
  ariaLabel?: string;
}) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [loading, startLoading] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(current);
  const [preview, setPreview] = useState<StartPreview | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const latest = useRef(date);
  latest.current = date;

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewErr(null);
    if (date === current || !isYmd(date)) return;
    const asked = date;
    const timer = setTimeout(() => {
      startLoading(async () => {
        const res = await previewMemberStartDate(membershipId, asked);
        if (latest.current !== asked) return;
        if (res?.ok && res.preview) setPreview(res.preview);
        else setPreviewErr(res?.error ?? "errGeneric");
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [date, open, current, membershipId]);

  const { min, max } = startBounds(today, groupStartsOn ?? null, current);
  const msg = (code: string) => (t.has(code) ? t(code) : t("errGeneric"));
  const blocked = !!preview?.errorCode || !!previewErr;
  const waiting = date !== current && isYmd(date) && !preview && !previewErr;

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
            setDate(current);
            setSaved(false);
            setErr(null);
            setOpen(true);
          }}
        >
          {label ?? t("editStartDate")}
        </Button>
        {saved && <span role="status" className="text-sm text-success">{t("startSaved")}</span>}
      </span>
    );
  }

  return (
    <form
      className="grid min-w-0 basis-full gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
        start(async () => {
          setErr(null);
          const res = await setMemberStartDate(membershipId, date, reason);
          if (res?.ok) {
            setOpen(false);
            setSaved(true);
          } else setErr(res?.error ?? "errGeneric");
        });
      }}
    >
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${uid}-d`}>{t("startDate")}</Label>
        <Input
          id={`${uid}-d`}
          type="date"
          dir="ltr"
          required
          value={date}
          min={min}
          max={max}
          className="h-11"
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${uid}-r`}>{t("startReason")}</Label>
        <Input id={`${uid}-r`} name="reason" required minLength={3} maxLength={300} className="h-11" />
      </div>
      <p aria-live="polite" className="min-w-0 break-words text-sm sm:col-span-2">
        {loading || waiting ? (
          <span className="text-muted-foreground">{t("previewLoading")}</span>
        ) : previewErr ? (
          <span className="text-danger">{msg(previewErr)}</span>
        ) : preview?.errorCode ? (
          <span className="text-danger">{msg(preview.errorCode)}</span>
        ) : preview ? (
          <span className="text-muted-foreground">
            {t("previewConsumed", { before: preview.consumedBefore, after: preview.consumedAfter })} ·{" "}
            {t("previewRemaining", { before: preview.remainingBefore, after: preview.remainingAfter })}
            {preview.unpaidAfter > 0 && <> · {t("previewOwes", { count: preview.unpaidAfter })}</>}
          </span>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <Button type="submit" size="sm" className="min-h-11" disabled={pending || loading || waiting || date === current || blocked}>
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
            setErr(null);
            setDate(current);
          }}
        >
          {t("cancel")}
        </Button>
        {err && <p role="alert" className="min-w-0 break-words text-sm text-danger">{msg(err)}</p>}
      </div>
    </form>
  );
}
