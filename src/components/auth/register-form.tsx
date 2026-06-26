"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [role, setRole] = useState<"athlete" | "coach">("athlete");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <div className="space-y-1.5">
        <Label>{t("chooseRole")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["athlete", "coach"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                role === r ? "border-gold bg-gold/10 text-gold-deep" : "border-border hover:bg-muted",
              )}
            >
              {r === "athlete" ? t("asAthlete") : t("asCoach")}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t("firstName")}</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t("lastName")}</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" placeholder="••••••••" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("register")}
      </Button>
    </form>
  );
}
