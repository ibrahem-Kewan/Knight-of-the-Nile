"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { finalizeResult } from "@/server/actions/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export function ScoreRow({
  registrationId, athlete, discipline, initialPoints, finalized,
}: {
  registrationId: string; athlete: string; discipline: string; initialPoints: number | null; finalized: boolean;
}) {
  const t = useTranslations("scoring");
  const [points, setPoints] = useState(initialPoints != null ? String(initialPoints) : "");
  const [isFinal, setIsFinal] = useState(finalized);
  const [pending, start] = useTransition();

  return (
    <tr className="border-t border-border">
      <td className="p-3 font-medium">{athlete}</td>
      <td className="p-3 text-muted-foreground">{discipline}</td>
      <td className="p-3">
        <Input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          className="h-9 w-28"
          disabled={pending}
        />
      </td>
      <td className="p-3">
        {isFinal ? (
          <Badge variant="success"><Check className="me-1 h-3 w-3" /> {t("finalized")}</Badge>
        ) : (
          <Button
            size="sm"
            disabled={pending || points === ""}
            onClick={() =>
              start(async () => {
                const res = await finalizeResult(registrationId, Number(points));
                if (res?.ok) setIsFinal(true);
              })
            }
          >
            {t("finalize")}
          </Button>
        )}
      </td>
    </tr>
  );
}
