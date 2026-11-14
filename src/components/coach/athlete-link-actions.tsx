"use client";

import { useTranslations } from "next-intl";
import { approveAthleteLink, rejectAthleteLink } from "@/server/actions/coach";
import { Button } from "@/components/ui/button";
import { ActionError, useAction } from "@/components/shared/action-error";

export function AthleteLinkActions({ linkId }: { linkId: string }) {
  const t = useTranslations("coach");
  const { pending, error, run } = useAction();

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => approveAthleteLink(linkId))}>
        {t("approve")}
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => rejectAthleteLink(linkId))}>
        {t("reject")}
      </Button>
      <ActionError code={error} />
    </div>
  );
}
