"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/server/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  // Lets the user go back to the form (e.g. typo in the e-mail) after a successful send.
  const [dismissedState, setDismissedState] = useState<typeof state>(undefined);
  const sent = state?.ok && state !== dismissedState;

  if (sent) {
    return (
      <div role="status" className="space-y-4 rounded-lg border border-gold/40 bg-gold/10 p-5 text-start">
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
          <div className="space-y-2">
            <p className="font-medium">{t("resetLinkSent")}</p>
            <p className="text-sm text-muted-foreground">{t("resetLinkSentHint")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => setDismissedState(state)}>
            {t("tryAnotherEmail")}
          </Button>
        </div>
      </div>
    );
  }

  const errorText = state?.error ? (t.has(state.error) ? t(state.error as never) : t("errResetFailed")) : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          dir="ltr"
          className="text-start"
          placeholder="you@example.com"
        />
      </div>
      {errorText && (
        <p role="alert" className="text-sm text-danger">
          {errorText}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? t("sending") : t("sendResetLink")}
      </Button>
    </form>
  );
}
