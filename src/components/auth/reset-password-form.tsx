"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { completePasswordReset } from "@/server/actions/password-reset";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(completePasswordReset, undefined);
  const errorText = state?.error ? (t.has(state.error) ? t(state.error as never) : t("errResetFailed")) : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" autoFocus />
        <p className="text-xs text-muted-foreground">{t("errPasswordShort")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t("confirmNewPassword")}</Label>
        <PasswordInput id="confirm" name="confirm" required minLength={8} autoComplete="new-password" />
      </div>
      {errorText && (
        <p role="alert" className="text-sm text-danger">
          {errorText}
          {state?.error === "errResetSession" && (
            <>
              {" "}
              <Link href="/forgot-password" className="font-medium text-nile underline">
                {t("requestNewLink")}
              </Link>
            </>
          )}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("savePassword")}
      </Button>
    </form>
  );
}
