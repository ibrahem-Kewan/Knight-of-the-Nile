"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { cancelSession, restoreSession } from "@/server/actions/training";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SessionView = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  /** "upcoming" = scheduled in the future, "held" = scheduled and already past, "cancelled" otherwise. */
  state: "upcoming" | "held" | "cancelled";
  cancelKind: "holiday" | "coach_absent" | "other" | null;
  /** Coach may still change this session (within 7 days after its time). */
  editable: boolean;
  cancelReason: string | null;
  /** Attendance link target; null when attendance is not open (cancelled or more than 1 hour ahead). */
  attendanceHref: string | null;
  /** Past the 7-day window: the attendance page is read-only. */
  attendanceReadOnly: boolean;
  /** Present / eligible-members counts, only for sessions where attendance is open or held. */
  counts: { present: number; total: number } | null;
};

const SELECT_CLS =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

const KIND_KEY = { holiday: "holiday", coach_absent: "coachAbsent", other: "otherReason" } as const;

export function SessionRow({ s }: { s: SessionView }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cancelled = s.state === "cancelled";
  const badge =
    s.state === "upcoming"
      ? { variant: "default" as const, text: t("scheduled") }
      : s.state === "held"
        ? { variant: "success" as const, text: t("held") }
        : { variant: s.cancelKind === "holiday" ? ("warning" as const) : ("danger" as const), text: t(KIND_KEY[s.cancelKind ?? "other"]) };

  const fail = (key?: string) => setErr(key && t.has(key) ? key : "errGeneric");

  const onCancel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      setErr(null);
      const res = await cancelSession(s.id, String(fd.get("kind") ?? ""), String(fd.get("reason") ?? ""));
      if (res?.ok) setOpen(false);
      else fail(res?.error);
    });
  };

  const onRestore = () =>
    start(async () => {
      setErr(null);
      const res = await restoreSession(s.id);
      if (!res?.ok) fail(res?.error);
    });

  return (
    <li
      className={`min-w-0 space-y-2 rounded-md border p-3 ${cancelled ? "border-dashed border-border bg-muted/40" : "border-border"}`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`break-words font-medium ${cancelled ? "text-muted-foreground line-through" : ""}`}>{s.dateLabel}</p>
          <p className="text-sm text-muted-foreground" dir="ltr">
            <span className="inline-block">{s.timeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant}>{badge.text}</Badge>
          {s.counts && (
            <span className="text-sm text-muted-foreground">
              {t("presentCount", { present: s.counts.present, total: s.counts.total })}
            </span>
          )}
          {s.attendanceHref && (
            <Link href={s.attendanceHref} className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-11" })}>
              {s.attendanceReadOnly ? t("viewAttendance") : t("takeAttendance")}
            </Link>
          )}
          {(s.state === "upcoming" || s.state === "held") && s.editable && !open && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setOpen(true)} disabled={pending}>
              {t("cancelSession")}
            </Button>
          )}
          {cancelled && s.editable && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onRestore} disabled={pending}>
              {t("restoreSession")}
            </Button>
          )}
        </div>
      </div>

      {cancelled && s.cancelReason && (
        <p className="break-words text-sm text-muted-foreground">
          {t("reason")}: {s.cancelReason}
        </p>
      )}

      {open && (
        <form onSubmit={onCancel} className="grid min-w-0 gap-3 rounded-md border border-border bg-card p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-kind`}>{t("kind")}</Label>
            <select id={`${uid}-kind`} name="kind" required defaultValue={s.state === "upcoming" ? "holiday" : "coach_absent"} className={SELECT_CLS}>
              {s.state === "upcoming" && <option value="holiday">{t("holiday")}</option>}
              <option value="coach_absent">{t("coachAbsent")}</option>
              <option value="other">{t("otherReason")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-reason`}>{t("reason")}</Label>
            <Input id={`${uid}-reason`} name="reason" required minLength={3} maxLength={200} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" variant="destructive" className="min-h-11" disabled={pending}>
              {t("confirmCancel")}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => { setOpen(false); setErr(null); }} disabled={pending}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}

      {err && (
        <p role="alert" className="text-xs text-danger">
          {t.has(err) ? t(err) : t("errGeneric")}
        </p>
      )}
    </li>
  );
}
