"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { assignJudge, removeJudge } from "@/server/actions/tournaments";
import { errorLabel } from "@/lib/i18n/labels";

type Person = { id: string; name: string };
type StaffMember = Person & { isCoach?: boolean };

/**
 * Judging staff of a tournament (PR-12, PR-14): current judges as chips (removable, except the
 * creator; coaches are tagged) plus two pickers — one for judges and one for coaches. Both kinds
 * become judges of the tournament and can score it.
 */
export function TournamentJudges({
  tournamentId,
  creatorId,
  current,
  judgeCandidates,
  coachCandidates,
}: {
  tournamentId: string;
  creatorId: string | null;
  current: StaffMember[];
  judgeCandidates: Person[];
  coachCandidates: Person[];
}) {
  const t = useTranslations("tadmin");
  const tErr = useTranslations("errors");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const currentIds = new Set(current.map((p) => p.id));
  const judgeOptions = judgeCandidates.filter((c) => !currentIds.has(c.id));
  const coachOptions = coachCandidates.filter((c) => !currentIds.has(c.id));

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    start(async () => {
      setErr(null);
      const res = await fn();
      if (!res?.ok) setErr(errorLabel(tErr, res?.error));
    });

  const picker = (label: string, options: Person[]) =>
    options.length > 0 && (
      <select
        value=""
        disabled={pending}
        aria-label={label}
        onChange={(e) => { const v = e.target.value; if (v) run(() => assignJudge(tournamentId, v)); }}
        className="h-8 max-w-[12rem] rounded-md border border-border bg-background px-2 text-xs"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    );

  return (
    <div className="flex basis-full flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t("judges")}:</span>
      {current.length === 0 && <span className="text-xs text-muted-foreground">{t("noJudges")}</span>}
      {current.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 py-0.5 ps-2.5 pe-1 text-xs">
          {p.name}
          {p.isCoach && p.id !== creatorId && <span className="text-muted-foreground">({t("coachTag")})</span>}
          {p.id === creatorId ? (
            <span className="pe-1.5 text-muted-foreground">({t("mainJudge")})</span>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => removeJudge(tournamentId, p.id))}
              aria-label={`${t("removeJudge")}: ${p.name}`}
              title={t("removeJudge")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </span>
      ))}
      {picker(t("assignJudge"), judgeOptions)}
      {picker(t("assignCoach"), coachOptions)}
      {err && <span role="alert" className="basis-full text-xs text-danger">{err}</span>}
    </div>
  );
}
