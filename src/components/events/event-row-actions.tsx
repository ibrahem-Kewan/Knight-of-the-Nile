"use client";

import { useTranslations } from "next-intl";
import { setEventStatus } from "@/server/actions/events";
import { Button } from "@/components/ui/button";
import { ActionError, useAction } from "@/components/shared/action-error";

const NEXT: Record<string, { to: string; key: string }[]> = {
  draft: [{ to: "published", key: "publish" }],
  published: [{ to: "registration_open", key: "openReg" }],
  registration_open: [{ to: "registration_closed", key: "closeReg" }],
  registration_closed: [{ to: "ongoing", key: "start_" }],
  ongoing: [{ to: "completed", key: "complete" }],
};

export function EventRowActions({ id, status }: { id: string; status: string }) {
  const t = useTranslations("events");
  const { pending, error, run } = useAction();
  const transitions = NEXT[status] ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {transitions.map((tr) => (
        <Button key={tr.to} size="sm" disabled={pending} onClick={() => run(() => setEventStatus(id, tr.to))}>
          {t(tr.key as never)}
        </Button>
      ))}
      {status !== "cancelled" && status !== "completed" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setEventStatus(id, "cancelled"))}>
          {t("cancelEvent")}
        </Button>
      )}
      <ActionError code={error} />
    </div>
  );
}
