"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveRoleRequest, rejectRoleRequest } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function RequestActions({ id }: { id: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(() => { void approveRoleRequest(id); })}>
        <Check className="h-3.5 w-3.5" /> {t("approve")}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(() => { void rejectRoleRequest(id); })}>
        <X className="h-3.5 w-3.5" /> {t("reject")}
      </Button>
    </div>
  );
}
