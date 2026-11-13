"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setTournamentStatus, setTournamentDiscipline } from "@/server/actions/tournaments";
import { Button } from "@/components/ui/button";

type Discipline = { id: string; sport_id: string; name_ar: string; name_en: string };

const NEXT: Record<string, { to: string; key: string }[]> = {
  draft: [{ to: "published", key: "publish" }],
  published: [{ to: "registration_open", key: "openReg" }],
  registration_open: [{ to: "registration_closed", key: "closeReg" }],
  registration_closed: [{ to: "ongoing", key: "start_" }],
  ongoing: [{ to: "completed", key: "complete" }],
};

export function TournamentRowActions({
  id,
  status,
  sportId,
  disciplines = [],
  currentDisciplineId = "",
}: {
  id: string;
  status: string;
  sportId?: string;
  disciplines?: Discipline[];
  currentDisciplineId?: string;
}) {
  const t = useTranslations("tadmin");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const transitions = NEXT[status] ?? [];
  const catOptions = disciplines.filter((d) => !sportId || d.sport_id === sportId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {transitions.map((tr) => (
        <Button key={tr.to} size="sm" disabled={pending} onClick={() => start(() => { void setTournamentStatus(id, tr.to); })}>
          {t(tr.key as never)}
        </Button>
      ))}
      {catOptions.length > 0 && (
        <select
          defaultValue={currentDisciplineId}
          disabled={pending}
          onChange={(e) => { if (e.target.value) start(() => { void setTournamentDiscipline(id, e.target.value); }); }}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          title={t("category")}
        >
          <option value="">{t("category")}</option>
          {catOptions.map((d) => (
            <option key={d.id} value={d.id}>{locale === "ar" ? d.name_ar : d.name_en}</option>
          ))}
        </select>
      )}
    </div>
  );
}
