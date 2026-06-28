"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { registerToTournament } from "@/server/actions/registration";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type Discipline = { id: string; name_ar: string; name_en: string };

export function RegisterControl({ tournamentId, disciplines }: { tournamentId: string; disciplines: Discipline[] }) {
  const t = useTranslations("treg");
  const locale = useLocale();
  const [disc, setDisc] = useState(disciplines[0]?.id ?? "");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-4 text-success">
        <CheckCircle2 className="h-5 w-5" /> {t("success")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-3 font-semibold">{t("register")}</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm text-muted-foreground">{t("chooseDiscipline")}</label>
          <select
            value={disc}
            onChange={(e) => setDisc(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>{locale === "ar" ? d.name_ar : d.name_en}</option>
            ))}
          </select>
        </div>
        <Button
          disabled={pending || !disc}
          onClick={() =>
            start(async () => {
              setErr(null);
              const res = await registerToTournament(tournamentId, disc);
              if (res?.ok) setDone(true);
              else if (res?.error === "already") setErr(t("already"));
              else if (res?.error === "closed") setErr(t("closed"));
              else setErr(t("onlyAthletes"));
            })
          }
        >
          {t("submit")}
        </Button>
      </div>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </div>
  );
}
