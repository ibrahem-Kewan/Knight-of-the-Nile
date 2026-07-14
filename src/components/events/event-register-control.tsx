"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { registerToEvent } from "@/server/actions/events";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function EventRegisterControl({ eventId }: { eventId: string }) {
  const t = useTranslations("events");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-4 text-success">
        <CheckCircle2 className="h-5 w-5" /> {t("registered")}
      </p>
    );
  }

  return (
    <div>
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const res = await registerToEvent(eventId);
            if (res?.ok) setDone(true);
            else if (res?.error === "already") setErr(t("alreadyRegistered"));
            else if (res?.error === "closed") setErr(t("regClosed"));
            else setErr(t("mustLogin"));
          })
        }
      >
        {t("registerCta")}
      </Button>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </div>
  );
}
