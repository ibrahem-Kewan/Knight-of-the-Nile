"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { confirmPayment, recordPayment, rejectPayment, voidPayment } from "@/server/actions/training-payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLS =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

type Res = { ok?: true; error?: string };

function ErrorLine({ err }: { err: string | null }) {
  const t = useTranslations("training");
  if (!err) return null;
  return (
    <p role="alert" className="basis-full text-xs text-danger">
      {t.has(err) ? t(err) : t("errGeneric")}
    </p>
  );
}

/** Confirm, or reject with a reason, a pending declaration. */
export function ConfirmRejectButtons({ cycleId, amountLabel }: { cycleId: string; amountLabel: string }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<Res>, onOk?: () => void) =>
    start(async () => {
      setErr(null);
      const res = await fn();
      if (res?.ok) onOk?.();
      else setErr(res?.error ?? "errGeneric");
    });

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2">
      {!rejecting && (
        <>
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={pending}
            onClick={() => (armed ? run(() => confirmPayment(cycleId), () => setArmed(false)) : setArmed(true))}
          >
            {armed ? t("confirmAmount", { amount: amountLabel }) : t("confirm")}
          </Button>
          {armed && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending} onClick={() => { setArmed(false); setErr(null); }}>
              {t("cancel")}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending || armed} onClick={() => setRejecting(true)}>
            {t("reject")}
          </Button>
        </>
      )}
      {rejecting && (
        <form
          className="flex min-w-0 basis-full flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
            run(() => rejectPayment(cycleId, reason), () => setRejecting(false));
          }}
        >
          <div className="min-w-0 flex-1 basis-48 space-y-1.5">
            <Label htmlFor={`${uid}-r`}>{t("rejectReason")}</Label>
            <Input id={`${uid}-r`} name="reason" required minLength={3} maxLength={300} />
          </div>
          <Button type="submit" variant="destructive" size="sm" className="min-h-11" disabled={pending}>
            {t("reject")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending} onClick={() => { setRejecting(false); setErr(null); }}>
            {t("cancel")}
          </Button>
        </form>
      )}
      <ErrorLine err={err} />
    </div>
  );
}

/** Voids a confirmed cycle with a mandatory reason (the row is kept as history). */
export function VoidButton({ cycleId }: { cycleId: string }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
        {t("void")}
      </Button>
    );
  }
  return (
    <form
      className="flex min-w-0 basis-full flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
        start(async () => {
          setErr(null);
          const res = await voidPayment(cycleId, reason);
          if (res?.ok) setOpen(false);
          else setErr(res?.error ?? "errGeneric");
        });
      }}
    >
      <div className="min-w-0 flex-1 basis-48 space-y-1.5">
        <Label htmlFor={`${uid}-v`}>{t("voidReason")}</Label>
        <Input id={`${uid}-v`} name="reason" required minLength={3} maxLength={300} />
      </div>
      <Button type="submit" variant="destructive" size="sm" className="min-h-11" disabled={pending}>
        {t("void")}
      </Button>
      <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending} onClick={() => { setOpen(false); setErr(null); }}>
        {t("cancel")}
      </Button>
      <ErrorLine err={err} />
    </form>
  );
}

/** Coach records a payment directly (confirmed at once). Amount and sessions come from the group, never the form. */
export function RecordPaymentForm({ groupId, members }: { groupId: string; members: { id: string; name: string }[] }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState("cash");

  return (
    <form
      className="grid min-w-0 gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          setErr(null);
          setDone(false);
          const res = await recordPayment(groupId, String(fd.get("athlete_id") ?? ""), fd);
          if (res?.ok) {
            form.reset();
            setDone(true);
          } else setErr(res?.error ?? "errGeneric");
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-a`}>{t("member")}</Label>
        <select id={`${uid}-a`} name="athlete_id" required defaultValue="" className={SELECT_CLS}>
          <option value="" disabled>—</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-m`}>{t("method")}</Label>
        <select id={`${uid}-m`} name="method" value={method} onChange={(e) => setMethod(e.target.value)} className={SELECT_CLS}>
          <option value="cash">{t("cash")}</option>
          <option value="instapay">{t("instapay")}</option>
          <option value="other">{t("other")}</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-ref`}>{t("paymentRef")}</Label>
        <Input id={`${uid}-ref`} name="payment_ref" maxLength={80} required={method === "instapay"} minLength={method === "instapay" ? 3 : undefined} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-n`}>{t("note")}</Label>
        <Input id={`${uid}-n`} name="note" maxLength={300} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" className="min-h-11" disabled={pending || !members.length}>
          {t("recordPayment")}
        </Button>
        {done && <span role="status" className="text-sm text-success">{t("recorded")}</span>}
        <ErrorLine err={err} />
      </div>
    </form>
  );
}
