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
}: {
  initialType: RegType;
  initialCoachId: string;
  coaches: Coach[];
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
              checked={regType === o.value}
              onChange={() => setRegType(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
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
      <Button type="submit" disabled={pending || unchanged || teamNeedsCoach}>
        {t("regTypeSave")}
      </Button>
    </form>
  );
}
