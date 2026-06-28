"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setTournamentStatus, assignJudge } from "@/server/actions/tournaments";
import { Button } from "@/components/ui/button";

type Judge = { id: string; name: string };

const NEXT: Record<string, { to: string; key: string }[]> = {
  draft: [{ to: "published", key: "publish" }],
  published: [{ to: "registration_open", key: "openReg" }],
  registration_open: [{ to: "registration_closed", key: "closeReg" }],
  registration_closed: [{ to: "ongoing", key: "start_" }],
  ongoing: [{ to: "completed", key: "complete" }],
};

export function TournamentRowActions({ id, status, judges }: { id: string; status: string; judges: Judge[] }) {
  const t = useTranslations("tadmin");
  const [pending, start] = useTransition();
  const transitions = NEXT[status] ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {transitions.map((tr) => (
        <Button key={tr.to} size="sm" disabled={pending} onClick={() => start(() => { void setTournamentStatus(id, tr.to); })}>
          {t(tr.key as never)}
        </Button>
      ))}
      <select
        defaultValue=""
        disabled={pending}
        onChange={(e) => { if (e.target.value) start(() => { void assignJudge(id, e.target.value); }); }}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
      >
        <option value="">{t("assignJudge")}</option>
        {judges.map((j) => (
          <option key={j.id} value={j.id}>{j.name}</option>
        ))}
      </select>
    </div>
  );
}
