"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createGroup, updateGroup } from "@/server/actions/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { weekdayOrder } from "@/lib/training/schedule";
import { Pencil, Plus } from "lucide-react";

export type BranchOption = { id: string; name_ar: string; name_en: string | null };
export type SportOption = { id: string; name_ar: string; name_en: string };

export type GroupValues = {
  id: string;
  branch_id: string;
  sport_id: string | null;
  name_ar: string;
  name_en: string | null;
  weekdays: number[];
  start_time: string;
  duration_minutes: number;
  sessions_per_cycle: number;
  monthly_fee: number | string;
  starts_on: string;
};

const SELECT_CLS =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

/** One form for create (no `group`) and edit (`group` given). */
export function GroupForm({
  branches,
  sports,
  group,
  defaultStartsOn,
}: {
  branches: BranchOption[];
  sports: SportOption[];
  group?: GroupValues;
  defaultStartsOn?: string;
}) {
  const t = useTranslations("training");
  const locale = useLocale();
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const editing = !!group;
  const p = group?.id ?? "new";
  const selectedDays = group?.weekdays ?? [];

  if (!open) {
    return editing ? (
      <Button variant="outline" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> {t("editGroup")}
      </Button>
    ) : (
      <Button className="min-h-11" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("newGroup")}
      </Button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = group ? await updateGroup(group.id, fd) : await createGroup(fd);
          if (res?.ok) setOpen(false);
          else setErr(res?.error ?? "errGeneric");
        })
      }
      className="w-full basis-full min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <h3 className="mb-4 font-semibold">{editing ? t("editGroup") : t("newGroup")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`g_name_ar_${p}`}>{t("nameAr")}</Label>
          <Input id={`g_name_ar_${p}`} name="name_ar" required minLength={2} maxLength={80} defaultValue={group?.name_ar ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g_name_en_${p}`}>{t("nameEn")}</Label>
          <Input id={`g_name_en_${p}`} name="name_en" dir="ltr" maxLength={80} defaultValue={group?.name_en ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g_branch_${p}`}>{t("branch")}</Label>
          <select id={`g_branch_${p}`} name="branch_id" required defaultValue={group?.branch_id ?? branches[0]?.id ?? ""} className={SELECT_CLS}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{ar ? b.name_ar : (b.name_en || b.name_ar)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g_sport_${p}`}>{t("sport")}</Label>
          <select id={`g_sport_${p}`} name="sport_id" defaultValue={group?.sport_id ?? ""} className={SELECT_CLS}>
            <option value="">{t("noSport")}</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</option>
            ))}
          </select>
        </div>

        <fieldset className="min-w-0 space-y-1.5 sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium">{t("weekdays")}</legend>
          <div className="flex flex-wrap gap-2">
            {weekdayOrder(locale).map((d) => (
              <label key={d} className="relative cursor-pointer">
                <input
                  type="checkbox"
                  name="weekdays"
                  value={d}
                  defaultChecked={selectedDays.includes(d)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 min-w-[4.25rem] items-center justify-center rounded-md border border-border bg-background px-3 text-sm transition-colors peer-checked:border-gold peer-checked:bg-primary/15 peer-checked:font-semibold peer-checked:text-gold-deep peer-focus-visible:ring-2 peer-focus-visible:ring-gold dark:peer-checked:text-gold">
                  {t(`weekday${d}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor={`g_time_${p}`}>{t("startTime")}</Label>
          <Input id={`g_time_${p}`} name="start_time" type="time" required dir="ltr" defaultValue={group?.start_time?.slice(0, 5) ?? "18:00"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g_dur_${p}`}>{t("duration")} ({t("minutes")})</Label>
          <Input id={`g_dur_${p}`} name="duration_minutes" type="number" inputMode="numeric" required min={15} max={480} step={5} dir="ltr" defaultValue={group?.duration_minutes ?? 90} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g_sess_${p}`}>{t("sessionsPerCycle")}</Label>
          <Input id={`g_sess_${p}`} name="sessions_per_cycle" type="number" inputMode="numeric" required min={1} max={31} dir="ltr" defaultValue={group?.sessions_per_cycle ?? 4} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g_fee_${p}`}>{t("monthlyFee")}</Label>
          <Input id={`g_fee_${p}`} name="monthly_fee" type="number" inputMode="decimal" required min={0} step="0.01" dir="ltr" defaultValue={group?.monthly_fee ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`g_start_${p}`}>{t("startsOn")}</Label>
          <Input id={`g_start_${p}`} name="starts_on" type="date" required dir="ltr" defaultValue={group?.starts_on ?? defaultStartsOn ?? ""} />
        </div>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-danger">{t.has(err) ? t(err) : t("errGeneric")}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" disabled={pending}>{t("save")}</Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>{t("cancel")}</Button>
      </div>
    </form>
  );
}
