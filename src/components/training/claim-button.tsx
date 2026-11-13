"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createAttendanceClaim } from "@/server/actions/training";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const AREA_CLS =
  "min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

/** Athlete: "I attended — alert the coach". Expands to a short message box, then sends. */
export function ClaimButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
        {t("iAttended")}
      </Button>
    );
  }

  return (
    <form
      className="min-w-0 basis-full space-y-2 rounded-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const message = String(new FormData(e.currentTarget).get("message") ?? "");
        start(async () => {
          setErr(null);
          const res = await createAttendanceClaim(sessionId, message);
          if (res?.ok) setOpen(false);
          else setErr(res?.error ?? "errGeneric");
        });
      }}
    >
      <Label htmlFor={`${uid}-m`}>{t("claimMessage")}</Label>
      <textarea id={`${uid}-m`} name="message" maxLength={300} className={AREA_CLS} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="min-h-11" disabled={pending}>
          {t("sendClaim")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setErr(null);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
      {err && (
        <p role="alert" className="text-xs text-danger">
          {t.has(err) ? t(err) : t("errGeneric")}
        </p>
      )}
    </form>
  );
}
