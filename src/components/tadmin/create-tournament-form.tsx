"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { createTournament, updateTournament } from "@/server/actions/tournaments";
import { Button } from "@/components/ui/button";
import { errorLabel } from "@/lib/i18n/labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { Pencil, Plus } from "lucide-react";

type Sport = { id: string; name_ar: string; name_en: string };
type Discipline = { id: string; sport_id: string; name_ar: string; name_en: string };

/** Current values of a tournament being edited (PR-11). Dates may be full timestamps. */
export type TournamentInitial = {
  id: string;
  title_ar: string;
  title_en: string | null;
  sport_id: string;
  discipline_id?: string | null;
  scope: string | null;
  venue: string | null;
  max_participants: number | null;
  start_date: string | null;
  end_date: string | null;
  registration_end: string | null;
  fees: number | string | null;
};

const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

/** Create form (inline) — or, when `initial` is given, an edit form inside a dialog. */
export function CreateTournamentForm({
  sports,
  disciplines = [],
  initial,
}: {
  sports: Sport[];
  disciplines?: Discipline[];
  initial?: TournamentInitial;
}) {
  const t = useTranslations("tadmin");
  const tm = useTranslations("manage");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [sportId, setSportId] = useState(initial?.sport_id ?? sports[0]?.id ?? "");
  const fid = (k: string) => `${initial?.id ?? "new"}-t-${k}`;

  const sportDisciplines = useMemo(
    () => disciplines.filter((d) => d.sport_id === sportId),
    [disciplines, sportId],
  );

  const form = (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = initial ? await updateTournament(initial.id, fd) : await createTournament(fd);
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
          <Input id={fid("title_en")} name="title_en" defaultValue={initial?.title_en ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("sport_id")}>{t("sport")}</Label>
          <select
            id={fid("sport_id")}
            name="sport_id"
            required
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{locale === "ar" ? s.name_ar : s.name_en}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("discipline_id")}>{t("category")}</Label>
          <select
            id={fid("discipline_id")}
            name="discipline_id"
            defaultValue={initial?.discipline_id ?? ""}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            disabled={sportDisciplines.length === 0}
          >
            <option value="">{t("categoryNone")}</option>
            {sportDisciplines.map((d) => (
              <option key={d.id} value={d.id}>{locale === "ar" ? d.name_ar : d.name_en}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("scope")}>{t("scope")}</Label>
          <select
            id={fid("scope")}
            name="scope"
            defaultValue={initial?.scope ?? "local"}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="local">{t("scopeLocal")}</option>
            <option value="governorate">{t("scopeGov")}</option>
            <option value="country">{t("scopeCountry")}</option>
            <option value="international">{t("scopeIntl")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("venue")}>{t("venue")}</Label>
          <Input id={fid("venue")} name="venue" defaultValue={initial?.venue ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("max_participants")}>{t("max")}</Label>
          <Input id={fid("max_participants")} name="max_participants" type="number" min="1" defaultValue={initial?.max_participants ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("start_date")}>{t("start")}</Label>
          <Input id={fid("start_date")} name="start_date" type="date" defaultValue={day(initial?.start_date)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("end_date")}>{t("end")}</Label>
          <Input id={fid("end_date")} name="end_date" type="date" defaultValue={day(initial?.end_date)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("registration_end")}>{t("regEnd")}</Label>
          <Input id={fid("registration_end")} name="registration_end" type="date" defaultValue={day(initial?.registration_end)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("fees")}>{t("fees")}</Label>
          <Input id={fid("fees")} name="fees" type="number" min="0" defaultValue={initial ? Number(initial.fees ?? 0) : "0"} />
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
