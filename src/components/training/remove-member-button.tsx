"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { removeFromGroup } from "@/server/actions/training";
import { Button } from "@/components/ui/button";

/** Removes (ends) a membership. `label` is the accessible name; `compact` renders it as a chip close button. */
export function RemoveMemberButton({
  membershipId,
  label,
  compact = false,
}: {
  membershipId: string;
  label: string;
  compact?: boolean;
}) {
  const t = useTranslations("training");
  const c = useTranslations("coach");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      setErr(null);
      const res = await removeFromGroup(membershipId);
      if (!res?.ok) setErr(res?.error ?? "errGeneric");
    });

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          aria-label={label}
          title={label}
          className="-me-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending} onClick={run} aria-label={label}>
          {c("remove")}
        </Button>
      )}
      {err && <span role="alert" className="basis-full text-xs text-danger">{t.has(err) ? t(err) : t("errGeneric")}</span>}
    </>
  );
}
