"use client";

import { useTranslations } from "next-intl";
import { moderatePost } from "@/server/actions/content";
import { Button } from "@/components/ui/button";
import { ActionError, useAction } from "@/components/shared/action-error";
import { Check, X } from "lucide-react";

export function PostModerate({ id }: { id: string }) {
  const t = useTranslations("pages.adminNews");
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => moderatePost(id, "publish"))}>
        <Check className="h-3.5 w-3.5" /> {t("publish")}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => moderatePost(id, "reject"))}>
        <X className="h-3.5 w-3.5" /> {t("reject")}
      </Button>
      <ActionError code={error} />
    </div>
  );
}
