"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveAthleteLink, rejectAthleteLink } from "@/server/actions/coach";
import { Button } from "@/components/ui/button";

export function AthleteLinkActions({ linkId }: { linkId: string }) {
  const t = useTranslations("coach");
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(() => { void approveAthleteLink(linkId); })}>
        {t("approve")}
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => { void rejectAthleteLink(linkId); })}>
        {t("reject")}
      </Button>
    </div>
  );
}
