"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitInstapayPayment } from "@/server/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Copy } from "lucide-react";

type Settings = { instapay_name?: string; instapay_handle?: string; instapay_phone?: string };

export function InstapayCheckout({
  context,
  refId,
  amount,
  currency,
  title,
  settings,
}: {
  context: "course" | "tournament" | "event";
  refId: string;
  amount: number;
  currency: string;
  title: string;
  settings: Settings;
}) {
  const t = useTranslations("checkout");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
        <p className="font-medium text-success">{t("submitted")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("submittedNote")}</p>
      </div>
    );
  }

  const row = (label: string, value?: string) =>
    value ? (
      <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex items-center gap-2 font-medium" dir="ltr">
          {value}
          <button type="button" onClick={() => navigator.clipboard?.writeText(value)} className="text-gold hover:opacity-70">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <span className="font-display text-xl text-gold">{amount > 0 ? `${amount} ${currency}` : t("free")}</span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">{t("instapayIntro")}</p>
        <div className="rounded-md bg-muted/50 p-4">
          {row(t("recipientName"), settings.instapay_name)}
          {row(t("recipientHandle"), settings.instapay_handle)}
          {row(t("recipientPhone"), settings.instapay_phone)}
          {!settings.instapay_name && !settings.instapay_handle && !settings.instapay_phone && (
            <p className="text-sm text-danger">{t("noRecipient")}</p>
          )}
        </div>
      </div>

      <form
        action={(fd) =>
          start(async () => {
            setErr(null);
            const res = await submitInstapayPayment({
              context,
              refId,
              amount,
              externalRef: String(fd.get("external_ref") || ""),
            });
            if (res?.ok) setDone(true);
            else setErr(t("error"));
          })
        }
        className="rounded-lg border border-border bg-card p-6"
      >
        <Label htmlFor="external_ref">{t("refLabel")}</Label>
        <Input id="external_ref" name="external_ref" required className="mt-1.5" dir="ltr" placeholder="INSTAPAY-…" />
        <p className="mt-2 text-xs text-muted-foreground">{t("refHint")}</p>
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        <Button type="submit" disabled={pending} className="mt-4">{t("confirm")}</Button>
      </form>
    </div>
  );
}
