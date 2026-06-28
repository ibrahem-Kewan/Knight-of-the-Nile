"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { requestRoleUpgrade } from "@/server/actions/role-request";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export function RoleRequestForm() {
  const t = useTranslations("roleReq");
  const [role, setRole] = useState<"coach" | "judge">("coach");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="font-medium">{t("success")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["coach", "judge"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-md border px-3 py-3 text-sm font-medium transition-colors",
              role === r ? "border-gold bg-gold/10 text-gold-deep" : "border-border hover:bg-muted",
            )}
          >
            {r === "coach" ? t("asCoach") : t("asJudge")}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">{t("note")}</Label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
      </div>
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const res = await requestRoleUpgrade(role, note);
            if (res?.ok) setDone(true);
            else if (res?.error === "pending-exists") setErr(t("already"));
            else setErr(t("already"));
          })
        }
      >
        {t("submit")}
      </Button>
    </div>
  );
}
