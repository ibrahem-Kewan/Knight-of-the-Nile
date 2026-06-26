"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { sendContact } from "@/server/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const t = useTranslations("contact");
  const [state, action, pending] = useActionState(sendContact, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="font-medium">{t("success")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subject">{t("subject")}</Label>
        <Input id="subject" name="subject" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">{t("message")}</Label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
