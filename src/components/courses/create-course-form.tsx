"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createCourse } from "@/server/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

type Sport = { id: string; name_ar: string; name_en: string };

export function CreateCourseForm({ sports = [] }: { sports?: Sport[] }) {
  const t = useTranslations("courses");
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
          const res = await createCourse(fd);
          if (res?.ok) setOpen(false);
          else setErr(res?.error ?? "error");
        })
      }
      className="rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c_title_ar">{t("titleAr")}</Label>
          <Input id="c_title_ar" name="title_ar" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c_title_en">{t("titleEn")}</Label>
          <Input id="c_title_en" name="title_en" dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c_sport">{t("sport")}</Label>
          <select id="c_sport" name="sport_id" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
            <option value="">{t("noSport")}</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{locale === "ar" ? s.name_ar : s.name_en}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c_level">{t("level")}</Label>
          <Input id="c_level" name="level" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c_price">{t("price")}</Label>
          <Input id="c_price" name="price" type="number" min="0" defaultValue="0" />
        </div>
        <div className="flex items-end gap-2">
          <input id="c_cert" name="certificate_enabled" type="checkbox" className="h-4 w-4" />
          <Label htmlFor="c_cert">{t("certificate")}</Label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c_desc">{t("description")}</Label>
          <textarea id="c_desc" name="description" rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
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
