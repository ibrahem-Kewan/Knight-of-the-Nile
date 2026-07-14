"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Coach = { id: string; name: string };

export function RegisterForm({ coaches = [] }: { coaches?: Coach[] }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(registerAction, undefined);

  return (
    <form action={action} className="space-y-4">
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
      {coaches.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="coach_id">{t("chooseCoach")}</Label>
          <select
            id="coach_id"
            name="coach_id"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">{t("noCoach")}</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("coachApprovalNote")}</p>
        </div>
      )}
      <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">{t("athleteNote")}</p>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("register")}
      </Button>
    </form>
  );
}
