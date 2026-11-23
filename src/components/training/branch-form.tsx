"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBranch, updateBranch } from "@/server/actions/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus } from "lucide-react";
import type { SportOption } from "@/components/training/group-form";

export type Governorate = { id: string; name_ar: string; name_en: string };

export type BranchValues = {
  id: string;
  name_ar: string;
  name_en: string | null;
  governorate_id: string | null;
  city: string | null;
  address: string | null;
  map_url: string | null;
  sport_ids: string[];
};

/** One form for create (no `branch`) and edit (`branch` given). */
export function BranchForm({
  governorates,
  sports,
  branch,
}: {
  governorates: Governorate[];
  sports: SportOption[];
  branch?: BranchValues;
}) {
  const t = useTranslations("training");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [govId, setGovId] = useState(branch?.governorate_id ?? "");
  const [city, setCity] = useState(branch?.city ?? "");
  const [sportIds, setSportIds] = useState<string[]>(branch?.sport_ids ?? []);
  const sortedGovs = useMemo(
    () =>
      [...governorates].sort((a, b) =>
        locale === "ar" ? a.name_ar.localeCompare(b.name_ar, "ar") : a.name_en.localeCompare(b.name_en, "en"),
      ),
    [governorates, locale],
  );
  const editing = !!branch;
  const openForm = () => {
    setGovId(branch?.governorate_id ?? "");
    setCity(branch?.city ?? "");
    setSportIds(branch?.sport_ids ?? []);
    setErr(null);
    setOpen(true);
  };
  const p = branch?.id ?? "new";

  if (!open) {
    return editing ? (
      <Button variant="outline" size="sm" className="min-h-11" onClick={openForm}>
        <Pencil className="h-4 w-4" /> {t("editBranch")}
      </Button>
    ) : (
      <Button className="min-h-11" onClick={openForm}>
        <Plus className="h-4 w-4" /> {t("newBranch")}
      </Button>
    );
  }

  return (
    <form
      // onSubmit (not `action`): React 19 resets a form after an action, which wiped the
      // fields and desynced the governorate select whenever saving failed.
      onSubmit={(e) => {
        e.preventDefault();
        // At least one training type is required (also enforced in the Server Action and the DB).
        if (sportIds.length === 0) {
          setErr("errBranchSports");
          return;
        }
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setErr(null);
          try {
            const res = branch ? await updateBranch(branch.id, fd) : await createBranch(fd);
            if (res?.ok) setOpen(false);
            else setErr(res?.error ?? "errGeneric");
          } catch {
            setErr("errGeneric");
          }
        });
      }}
      className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <h3 className="mb-4 font-semibold">{editing ? t("editBranch") : t("newBranch")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="min-w-0 space-y-1.5 sm:col-span-2" aria-describedby={`b_sports_hint_${p}`}>
          <legend className="mb-1.5 text-sm font-medium">{t("branchSports")}</legend>
          <div className="flex flex-wrap gap-2">
            {sports.map((s) => (
              <label key={s.id} className="relative cursor-pointer">
                <input
                  type="checkbox"
                  name="sport_ids"
                  value={s.id}
                  checked={sportIds.includes(s.id)}
                  onChange={(e) =>
                    setSportIds((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))
                  }
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 min-w-[4.25rem] items-center justify-center rounded-md border border-border bg-background px-3 text-sm transition-colors peer-checked:border-gold peer-checked:bg-primary/15 peer-checked:font-semibold peer-checked:text-gold-deep peer-focus-visible:ring-2 peer-focus-visible:ring-gold dark:peer-checked:text-gold">
                  {locale === "ar" ? s.name_ar : s.name_en}
                </span>
              </label>
            ))}
          </div>
          <p id={`b_sports_hint_${p}`} className="text-xs text-muted-foreground">
            {editing && (branch?.sport_ids?.length ?? 0) === 0 ? t("branchSportLegacyHint") : t("branchSportsHint")}
          </p>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor={`b_name_ar_${p}`}>{t("nameAr")}</Label>
          <Input id={`b_name_ar_${p}`} name="name_ar" required minLength={2} maxLength={80} defaultValue={branch?.name_ar ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`b_name_en_${p}`}>{t("nameEn")}</Label>
          <Input id={`b_name_en_${p}`} name="name_en" dir="ltr" maxLength={80} defaultValue={branch?.name_en ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`b_gov_${p}`}>{t("governorate")}</Label>
          <select
            id={`b_gov_${p}`}
            name="governorate_id"
            value={govId}
            onChange={(e) => {
              setGovId(e.target.value);
              if (!e.target.value) setCity("");
            }}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <option value="">{t("noGovernorate")}</option>
            {sortedGovs.map((g) => (
              <option key={g.id} value={g.id}>{locale === "ar" ? g.name_ar : g.name_en}</option>
            ))}
          </select>
        </div>
        {govId && (
          <div className="space-y-1.5">
            <Label htmlFor={`b_city_${p}`}>{t("city")}</Label>
            <Input
              id={`b_city_${p}`}
              name="city"
              dir="auto"
              minLength={2}
              maxLength={80}
              placeholder={t("cityPlaceholder")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`b_map_${p}`}>{t("mapUrl")}</Label>
          <Input id={`b_map_${p}`} name="map_url" type="url" dir="ltr" maxLength={500} placeholder="https://" defaultValue={branch?.map_url ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`b_addr_${p}`}>{t("address")}</Label>
          <Input id={`b_addr_${p}`} name="address" maxLength={200} defaultValue={branch?.address ?? ""} />
        </div>
      </div>
      {err && (
        <p role="alert" aria-live="polite" className="mt-3 text-sm text-danger">
          {t.has(err) ? t(err) : t("errGeneric")}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" disabled={pending} aria-busy={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>{t("cancel")}</Button>
      </div>
    </form>
  );
}
