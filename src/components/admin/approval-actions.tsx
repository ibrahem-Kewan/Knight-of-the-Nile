"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveUser, rejectUser } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function ApprovalActions({ userId }: { userId: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const exec = async (fn: () => Promise<{ ok?: boolean; error?: string }>) => {
    const r = await fn();
    setErr(r.error ? (t.has(r.error) ? t(r.error) : r.error) : null);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(() => exec(() => approveUser(userId)))}
      >
        <Check className="h-4 w-4" /> اعتماد
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => start(() => exec(() => rejectUser(userId)))}
      >
        <X className="h-4 w-4" /> رفض
      </Button>
      {err && <p role="alert" className="w-full text-xs text-danger break-words">{err}</p>}
    </div>
  );
}
