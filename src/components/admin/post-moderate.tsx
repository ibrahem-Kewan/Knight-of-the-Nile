"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { moderatePost } from "@/server/actions/content";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function PostModerate({ id }: { id: string }) {
  const t = useTranslations("pages.adminNews");
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(() => { void moderatePost(id, "publish"); })}>
        <Check className="h-3.5 w-3.5" /> {t("publish")}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(() => { void moderatePost(id, "reject"); })}>
        <X className="h-3.5 w-3.5" /> {t("reject")}
      </Button>
    </div>
  );
}
