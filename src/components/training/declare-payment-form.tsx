"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { declarePayment } from "@/server/actions/training-payments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLS =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

/** Athlete declares a payment for one group (used on the athlete's training page). The amount is never entered. */
export function DeclarePaymentForm({ groupId, hasOpenDeclaration = false }: { groupId: string; hasOpenDeclaration?: boolean }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [method, setMethod] = useState<"instapay" | "cash">("instapay");

  if (hasOpenDeclaration || sent) {
    return <Badge variant="warning">{t("pendingConfirmation")}</Badge>;
  }

  return (
    <form
      className="grid min-w-0 gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setErr(null);
          const res = await declarePayment(groupId, fd);
          if (res?.ok) setSent(true);
          else setErr(res?.error ?? "errGeneric");
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-m`}>{t("method")}</Label>
        <select id={`${uid}-m`} name="method" value={method} onChange={(e) => setMethod(e.target.value as "instapay" | "cash")} className={SELECT_CLS}>
          <option value="instapay">{t("instapay")}</option>
          <option value="cash">{t("cash")}</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-ref`}>{t("paymentRef")}</Label>
        <Input id={`${uid}-ref`} name="payment_ref" maxLength={80} required={method === "instapay"} minLength={method === "instapay" ? 3 : undefined} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${uid}-n`}>{t("note")}</Label>
        <Input id={`${uid}-n`} name="note" maxLength={300} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" className="min-h-11" disabled={pending}>
          {t("declarePayment")}
        </Button>
        {err && (
          <p role="alert" className="text-xs text-danger">
            {t.has(err) ? t(err) : t("errGeneric")}
          </p>
        )}
      </div>
    </form>
  );
}
