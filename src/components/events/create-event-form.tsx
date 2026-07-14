"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createEvent } from "@/server/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

type Sport = { id: string; name_ar: string; name_en: string };

export function CreateEventForm({ sports = [] }: { sports?: Sport[] }) {
  const t = useTranslations("events");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("new")}
      </Button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = await createEvent(fd);
          if (res?.ok) setOpen(false);
          else setErr(res?.error ?? "error");
        })
      }
      className="rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="e_title_ar">{t("titleAr")}</Label>
          <Input id="e_title_ar" name="title_ar" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_title_en">{t("titleEn")}</Label>
          <Input id="e_title_en" name="title_en" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_sport_id">{t("category")}</Label>
          <select id="e_sport_id" name="sport_id" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
            <option value="">{t("categoryNone")}</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{locale === "ar" ? s.name_ar : s.name_en}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_venue">{t("venue")}</Label>
          <Input id="e_venue" name="venue" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_start">{t("start")}</Label>
          <Input id="e_start" name="start_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_end">{t("end")}</Label>
          <Input id="e_end" name="end_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_regEnd">{t("regEnd")}</Label>
          <Input id="e_regEnd" name="registration_end" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_max">{t("max")}</Label>
          <Input id="e_max" name="max_participants" type="number" min="1" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e_fees">{t("fees")}</Label>
          <Input id="e_fees" name="fees" type="number" min="0" defaultValue="0" />
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={pending}>{t("save")}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
      </div>
    </form>
  );
}
