"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { markPaymentPaid } from "@/server/actions/payments";
import { Button } from "@/components/ui/button";

export function MarkPaidButton({ id }: { id: string }) {
  const t = useTranslations("payadmin");
  const [pending, start] = useTransition();
  return (
    <Button size="sm" disabled={pending} onClick={() => start(() => { void markPaymentPaid(id); })}>
      {t("markPaid")}
    </Button>
  );
}
