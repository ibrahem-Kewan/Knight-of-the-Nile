"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { registerAction } from "@/server/actions/auth";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

type Coach = { id: string; name: string };
type RegType = "individual" | "team";

export function RegisterForm({ coaches = [] }: { coaches?: Coach[] }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(registerAction, undefined);
  // Nothing preselected: the user must choose explicitly.
  const [regType, setRegType] = useState<RegType | null>(null);

  const options: { value: RegType; label: string }[] = [
    { value: "individual", label: t("typeIndividual") },
    { value: "team", label: t("typeTeam") },
  ];
  const errorText = state?.error ? (t.has(state.error) ? t(state.error) : t("errSignupFailed")) : null;

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
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          dir="ltr"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder={t("phonePlaceholder")}
          className="text-start"
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("registrationType")}</Label>
        <div role="radiogroup" aria-label={t("registrationType")} className="grid grid-cols-2 gap-3">
          {options.map((o) => (
            <label
              key={o.value}
              className={`flex h-10 cursor-pointer items-center justify-center rounded-md border text-sm transition-colors ${
                regType === o.value
                  ? "border-gold bg-gold/10 font-medium text-gold"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <input
                type="radio"
                name="registration_type"
                value={o.value}
                required
                checked={regType === o.value}
                onChange={() => setRegType(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <PasswordInput id="password" name="password" required autoComplete="new-password" placeholder="••••••••" />
      </div>
      {regType === "team" && (
        <div className="space-y-1.5">
          <Label htmlFor="coach_id">{t("chooseCoachRequired")}</Label>
          {coaches.length === 0 ? (
            <p className="text-sm text-danger">{t("noCoachesAvailable")}</p>
          ) : (
            <select
              id="coach_id"
              name="coach_id"
              required
              defaultValue=""
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="" disabled>{t("selectCoach")}</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-muted-foreground">{t("coachRequiredNote")}</p>
        </div>
      )}
      <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">{t("athleteNote")}</p>
      {errorText && (
        <p role="alert" className="text-sm text-danger">
          {errorText}
          {state?.error === "errEmailTaken" && (
            <>
              {" "}
              <Link href="/login" className="font-medium text-nile underline">
                {t("login")}
              </Link>
            </>
          )}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={pending || (regType === "team" && coaches.length === 0)}>
        {t("register")}
      </Button>
    </form>
  );
}
