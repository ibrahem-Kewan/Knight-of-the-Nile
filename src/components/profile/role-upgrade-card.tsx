"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { requestRoleUpgrade } from "@/server/actions/role-request";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export function RoleUpgradeCard({
  currentRole,
  pendingRole,
}: {
  currentRole: "athlete" | "coach";
  pendingRole?: string | null;
}) {
  const t = useTranslations("roleReq");
  const options: ("coach" | "judge")[] = currentRole === "athlete" ? ["coach", "judge"] : ["judge"];
  const [role, setRole] = useState<"coach" | "judge">(options[0]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("sub")}</p>
      </div>

      {pendingRole ? (
        <Badge variant="warning">
          {t("pending")}{pendingRole === "coach" ? t("asCoach") : t("asJudge")}
        </Badge>
      ) : done ? (
        <p className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-success">
          <CheckCircle2 className="h-5 w-5" /> {t("success")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {options.map((r) => (
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
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("note")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setErr(null);
                const res = await requestRoleUpgrade(role, note);
                if (res?.ok) setDone(true);
                else setErr(t("already"));
              })
            }
          >
            {t("submit")}
          </Button>
        </>
      )}
    </div>
  );
}
