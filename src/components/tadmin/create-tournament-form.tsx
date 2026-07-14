"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { createTournament } from "@/server/actions/tournaments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

type Sport = { id: string; name_ar: string; name_en: string };
type Discipline = { id: string; sport_id: string; name_ar: string; name_en: string };

export function CreateTournamentForm({
  sports,
  disciplines = [],
}: {
  sports: Sport[];
  disciplines?: Discipline[];
}) {
  const t = useTranslations("tadmin");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [sportId, setSportId] = useState(sports[0]?.id ?? "");

  const sportDisciplines = useMemo(
    () => disciplines.filter((d) => d.sport_id === sportId),
    [disciplines, sportId],
  );

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
          const res = await createTournament(fd);
          if (res?.ok) setOpen(false);
          else setErr(res?.error ?? "error");
        })
      }
      className="rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title_ar">{t("titleAr")}</Label>
          <Input id="title_ar" name="title_ar" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title_en">{t("titleEn")}</Label>
          <Input id="title_en" name="title_en" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sport_id">{t("sport")}</Label>
          <select
            id="sport_id"
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
          <Label htmlFor="discipline_id">{t("category")}</Label>
          <select
            id="discipline_id"
            name="discipline_id"
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
          <Label htmlFor="scope">{t("scope")}</Label>
          <select id="scope" name="scope" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
            <option value="local">{t("scopeLocal")}</option>
            <option value="governorate">{t("scopeGov")}</option>
            <option value="country">{t("scopeCountry")}</option>
            <option value="international">{t("scopeIntl")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="venue">{t("venue")}</Label>
          <Input id="venue" name="venue" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max_participants">{t("max")}</Label>
          <Input id="max_participants" name="max_participants" type="number" min="1" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start_date">{t("start")}</Label>
          <Input id="start_date" name="start_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">{t("end")}</Label>
          <Input id="end_date" name="end_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration_end">{t("regEnd")}</Label>
          <Input id="registration_end" name="registration_end" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fees">{t("fees")}</Label>
          <Input id="fees" name="fees" type="number" min="0" defaultValue="0" />
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
