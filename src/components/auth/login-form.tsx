"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Link } from "@/lib/i18n/navigation";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">{t("password")}</Label>
          <Link href="/forgot-password" className="text-sm font-medium text-nile hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
        <PasswordInput id="password" name="password" required autoComplete="current-password" placeholder="••••••••" />
      </div>
      {state?.error && (
        <p className="text-sm text-danger">{t.has(state.error) ? t(state.error as never) : t("errLoginFailed")}</p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("login")}
      </Button>
    </form>
  );
}
