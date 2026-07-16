"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setCourseStatus } from "@/server/actions/courses";
import { Button } from "@/components/ui/button";

export function CourseStatusButton({ id, status }: { id: string; status: string }) {
  const t = useTranslations("courses");
  const [pending, start] = useTransition();
  const next = status === "published" ? "draft" : "published";
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => { void setCourseStatus(id, next); })}>
      {status === "published" ? t("unpublish") : t("publish")}
    </Button>
  );
}
