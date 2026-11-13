"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { errorLabel } from "@/lib/i18n/labels";
import { approveRoleRequest, rejectRoleRequest } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function RequestActions({ id }: { id: string }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const exec = async (fn: () => Promise<{ ok?: boolean; error?: string }>) => {
    const r = await fn();
    setErr(r.error ? (t.has(r.error) ? t(r.error) : errorLabel(te, r.error)) : null);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(() => exec(() => approveRoleRequest(id)))}>
        <Check className="h-3.5 w-3.5" /> {t("approve")}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(() => exec(() => rejectRoleRequest(id)))}>
        <X className="h-3.5 w-3.5" /> {t("reject")}
      </Button>
      {err && <p role="alert" className="w-full text-xs text-danger break-words">{err}</p>}
    </div>
  );
}
