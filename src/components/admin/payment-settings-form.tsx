"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updatePaymentSettings } from "@/server/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type S = {
  instapay_name?: string;
  instapay_handle?: string;
  instapay_phone?: string;
  instructions_ar?: string;
  instructions_en?: string;
};

export function PaymentSettingsForm({ initial }: { initial: S }) {
  const t = useTranslations("payadmin");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      action={(fd) => start(async () => { setMsg(null); const r = await updatePaymentSettings(fd); setMsg(r?.ok ? t("saved") : t("error")); })}
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <h2 className="font-semibold">{t("instapaySettings")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="instapay_name">{t("name")}</Label>
          <Input id="instapay_name" name="instapay_name" defaultValue={initial.instapay_name ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instapay_handle">{t("handle")}</Label>
          <Input id="instapay_handle" name="instapay_handle" defaultValue={initial.instapay_handle ?? ""} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instapay_phone">{t("phone")}</Label>
          <Input id="instapay_phone" name="instapay_phone" defaultValue={initial.instapay_phone ?? ""} dir="ltr" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="instructions_ar">{t("instructionsAr")}</Label>
          <textarea id="instructions_ar" name="instructions_ar" rows={2} defaultValue={initial.instructions_ar ?? ""} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instructions_en">{t("instructionsEn")}</Label>
          <textarea id="instructions_en" name="instructions_en" rows={2} defaultValue={initial.instructions_en ?? ""} dir="ltr" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      {msg && <p className="text-sm text-success">{msg}</p>}
      <Button type="submit" disabled={pending}>{t("save")}</Button>
    </form>
  );
}
