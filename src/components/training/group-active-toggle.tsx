"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setGroupActive } from "@/server/actions/training";
import { Button } from "@/components/ui/button";

export function GroupActiveToggle({ id, active }: { id: string; active: boolean }) {
  const t = useTranslations("training");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-w-0">
      <Button
        variant="outline"
        size="sm"
        className="min-h-11"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const res = await setGroupActive(id, !active);
            if (!res?.ok) setErr(res?.error ?? "errGeneric");
          })
        }
      >
        {active ? t("deactivate") : t("activate")}
      </Button>
      {err && <p role="alert" className="mt-1 text-xs text-danger">{t.has(err) ? t(err) : t("errGeneric")}</p>}
    </div>
  );
}
