"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBranch, updateBranch } from "@/server/actions/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus } from "lucide-react";

export type Governorate = { id: string; name_ar: string; name_en: string };

export type BranchValues = {
  id: string;
  name_ar: string;
  name_en: string | null;
  governorate_id: string | null;
  address: string | null;
  map_url: string | null;
};

/** One form for create (no `branch`) and edit (`branch` given). */
export function BranchForm({ governorates, branch }: { governorates: Governorate[]; branch?: BranchValues }) {
  const t = useTranslations("training");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const editing = !!branch;
  const p = branch?.id ?? "new";

  if (!open) {
    return editing ? (
      <Button variant="outline" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> {t("editBranch")}
      </Button>
    ) : (
      <Button className="min-h-11" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("newBranch")}
      </Button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          setErr(null);
          const res = branch ? await updateBranch(branch.id, fd) : await createBranch(fd);
          if (res?.ok) setOpen(false);
          else setErr(res?.error ?? "errGeneric");
        })
      }
      className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <h3 className="mb-4 font-semibold">{editing ? t("editBranch") : t("newBranch")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
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
            defaultValue={branch?.governorate_id ?? ""}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <option value="">{t("noGovernorate")}</option>
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>{locale === "ar" ? g.name_ar : g.name_en}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`b_map_${p}`}>{t("mapUrl")}</Label>
          <Input id={`b_map_${p}`} name="map_url" type="url" dir="ltr" maxLength={500} placeholder="https://" defaultValue={branch?.map_url ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`b_addr_${p}`}>{t("address")}</Label>
          <Input id={`b_addr_${p}`} name="address" maxLength={200} defaultValue={branch?.address ?? ""} />
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
