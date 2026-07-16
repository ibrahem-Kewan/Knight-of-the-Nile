"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { changeMyPassword } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const t = useTranslations("profile");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setMsg(null); setErr(null);
          const res = await changeMyPassword(fd);
          if (res?.ok) { setMsg(t("passwordChanged")); (document.getElementById("pw-form") as HTMLFormElement)?.reset(); }
          else if (res?.error === "short") setErr(t("passwordShort"));
          else if (res?.error === "mismatch") setErr(t("passwordMismatch"));
          else setErr(t("error"));
        })
      }
      id="pw-form"
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <h2 className="font-semibold">{t("password")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new_password">{t("newPassword")}</Label>
          <Input id="new_password" name="new_password" type="password" autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" />
        </div>
      </div>
      {msg && <p className="text-sm text-success">{msg}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button type="submit" disabled={pending}>{t("changePassword")}</Button>
    </form>
  );
}
