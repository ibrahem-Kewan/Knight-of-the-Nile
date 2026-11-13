"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { resolveAttendanceClaim } from "@/server/actions/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Coach: accept (two-step confirm) or reject with a mandatory reason. */
export function ClaimActions({ claimId, athleteName, canAccept = true }: { claimId: string; athleteName: string; canAccept?: boolean }) {
  const t = useTranslations("training");
  const uid = useId();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"idle" | "accept" | "reject">("idle");
  const [err, setErr] = useState<string | null>(null);

  const run = (accept: boolean, note: string) =>
    start(async () => {
      setErr(null);
      const res = await resolveAttendanceClaim(claimId, accept, note);
      if (res?.ok) setMode("idle");
      else setErr(res?.error ?? "errGeneric");
    });

  const back = () => {
    setMode("idle");
    setErr(null);
  };

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2">
      {mode === "idle" && (
        <>
          {canAccept && (
            <Button type="button" size="sm" className="min-h-11" disabled={pending} onClick={() => setMode("accept")}>
              {t("accept")}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending} onClick={() => setMode("reject")}>
            {t("reject")}
          </Button>
        </>
      )}
      {mode === "accept" && (
        <>
          <Button type="button" size="sm" className="min-h-11" disabled={pending} onClick={() => run(true, "")}>
            {t("confirmAccept", { name: athleteName })}
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending} onClick={back}>
            {t("cancel")}
          </Button>
        </>
      )}
      {mode === "reject" && (
        <form
          className="flex min-w-0 basis-full flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(false, String(new FormData(e.currentTarget).get("reason") ?? ""));
          }}
        >
          <div className="min-w-0 flex-1 basis-48 space-y-1.5">
            <Label htmlFor={`${uid}-r`}>{t("rejectReason")}</Label>
            <Input id={`${uid}-r`} name="reason" required minLength={3} maxLength={300} />
          </div>
          <Button type="submit" variant="destructive" size="sm" className="min-h-11" disabled={pending}>
            {t("rejectWithReason")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={pending} onClick={back}>
            {t("cancel")}
          </Button>
        </form>
      )}
      {err && (
        <p role="alert" className="basis-full text-xs text-danger">
          {t.has(err) ? t(err) : t("errGeneric")}
        </p>
      )}
    </div>
  );
}
