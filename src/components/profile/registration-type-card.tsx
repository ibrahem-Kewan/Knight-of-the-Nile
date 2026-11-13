"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { changeRegistrationType } from "@/server/actions/registration-type";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Coach = { id: string; name: string };
type RegType = "individual" | "team";

export function RegistrationTypeCard({
  initialType,
  initialCoachId,
  coaches,
  awaitingCoach = null,
}: {
  initialType: RegType;
  initialCoachId: string;
  coaches: Coach[];
  /** Name of the coach whose reply is pending; non-null locks the card. */
  awaitingCoach?: string | null;
}) {
  const t = useTranslations("auth");
  const [pending, start] = useTransition();
  const [regType, setRegType] = useState<RegType>(initialType);
  const [coachId, setCoachId] = useState(initialCoachId);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const options: { value: RegType; label: string }[] = [
    { value: "individual", label: t("typeIndividual") },
    { value: "team", label: t("typeTeam") },
  ];
  const teamNeedsCoach = regType === "team" && !coachId;
  const unchanged = regType === initialType && (regType === "individual" || coachId === initialCoachId);
  const locked = awaitingCoach !== null;

  return (
    <form
      action={(fd) =>
        start(async () => {
          setMsg(null);
          setErr(null);
          const res = await changeRegistrationType(fd);
          if (res?.ok) setMsg(t("regTypeSaved"));
          else setErr(res?.error && t.has(res.error) ? t(res.error) : t("errGeneric"));
        })
      }
      className="space-y-4 rounded-lg border border-border bg-card p-6 text-start"
    >
      <div>
        <h2 className="font-semibold">{t("regTypeTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("regTypeHint")}</p>
      </div>
      {locked && (
        <p role="status" className="rounded-md border border-gold/40 bg-gold/10 p-3 text-sm text-foreground">
          {t("regTypeLocked", { coach: awaitingCoach })}
        </p>
      )}
      <fieldset
        disabled={locked || pending}
        role="radiogroup"
        aria-label={t("registrationType")}
        className="grid min-w-0 grid-cols-2 gap-3 disabled:opacity-60"
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex h-10 items-center ${locked ? "cursor-not-allowed" : "cursor-pointer"} justify-center rounded-md border text-sm transition-colors ${
              regType === o.value
                ? "border-gold bg-gold/10 font-medium text-gold"
                : "border-border bg-background text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <input
              type="radio"
              name="registration_type"
              value={o.value}
              checked={regType === o.value}
              onChange={() => setRegType(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </fieldset>
      {regType === "team" && (
        <div className="space-y-1.5">
          <Label htmlFor="coach_id_edit">{t("chooseCoachRequired")}</Label>
          {coaches.length === 0 ? (
            <p className="text-sm text-danger">{t("noCoachesAvailable")}</p>
          ) : (
            <select
              id="coach_id_edit"
              name="coach_id"
              required
              disabled={locked}
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="" disabled>{t("selectCoach")}</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-muted-foreground">{t("regTypeTeamWarn")}</p>
        </div>
      )}
      {msg && <p className="text-sm text-success">{msg}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button type="submit" disabled={locked || pending || unchanged || teamNeedsCoach}>
        {t("regTypeSave")}
      </Button>
    </form>
  );
}
