"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createCourse, updateCourse } from "@/server/actions/courses";
import { Button } from "@/components/ui/button";
import { errorLabel } from "@/lib/i18n/labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { Pencil, Plus } from "lucide-react";

type Sport = { id: string; name_ar: string; name_en: string };

/** Current values of a course being edited (PR-11). */
export type CourseInitial = {
  id: string;
  title_ar: string;
  title_en: string | null;
  sport_id: string | null;
  level: string | null;
  price: number | string | null;
  certificate_enabled: boolean | null;
  description_ar: string | null;
};

/** Create form (inline) — or, when `initial` is given, an edit form inside a dialog. */
export function CreateCourseForm({ sports = [], initial }: { sports?: Sport[]; initial?: CourseInitial }) {
  const t = useTranslations("courses");
  const tm = useTranslations("manage");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const fid = (k: string) => `${initial?.id ?? "new"}-c-${k}`;

  const form = (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = initial ? await updateCourse(initial.id, fd) : await createCourse(fd);
          if (res?.ok) setOpen(false);
          else setErr(errorLabel(tErr, res?.error));
        })
      }
      className={isEdit ? "" : "rounded-lg border border-border bg-card p-4 sm:p-6"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={fid("title_ar")}>{t("titleAr")}</Label>
          <Input id={fid("title_ar")} name="title_ar" required defaultValue={initial?.title_ar ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("title_en")}>{t("titleEn")}</Label>
          <Input id={fid("title_en")} name="title_en" dir="ltr" defaultValue={initial?.title_en ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("sport")}>{t("sport")}</Label>
          <select
            id={fid("sport")}
            name="sport_id"
            defaultValue={initial?.sport_id ?? ""}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">{t("noSport")}</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{locale === "ar" ? s.name_ar : s.name_en}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("level")}>{t("level")}</Label>
          <Input id={fid("level")} name="level" defaultValue={initial?.level ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("price")}>{t("price")}</Label>
          <Input id={fid("price")} name="price" type="number" min="0" defaultValue={initial ? Number(initial.price ?? 0) : "0"} />
        </div>
        <div className="flex items-end gap-2">
          <input
            id={fid("cert")}
            name="certificate_enabled"
            type="checkbox"
            defaultChecked={!!initial?.certificate_enabled}
            className="h-4 w-4"
          />
          <Label htmlFor={fid("cert")}>{t("certificate")}</Label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={fid("desc")}>{t("description")}</Label>
          <textarea
            id={fid("desc")}
            name="description"
            rows={3}
            defaultValue={initial?.description_ar ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      {isEdit && <p className="mt-3 text-xs text-muted-foreground">{tm("auditNote")}</p>}
      {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{t("save")}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
      </div>
    </form>
  );

  if (initial) {
    return (
      <FormDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (v) setErr(null); }}
        title={tm("editTitle")}
        trigger={
          <Button type="button" size="sm" variant="outline" aria-label={`${tm("edit")}: ${initial.title_ar}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> {tm("edit")}
          </Button>
        }
      >
        {form}
      </FormDialog>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("new")}
      </Button>
    );
  }

  return form;
}
