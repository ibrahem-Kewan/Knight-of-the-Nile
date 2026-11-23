"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { enumLabel } from "@/lib/i18n/labels";
import { STAFF_SPECIALTIES, specialtyGroup, type StaffRole, type StaffSpecialty } from "@/lib/staff/specialties";

/**
 * Multi-select of coach/judge specialties (PR-18). "All" is exclusive: picking it clears the rest,
 * picking anything else clears it. Native checkboxes in a fieldset: keyboard + screen-reader friendly,
 * RTL/LTR via logical properties, one column on phones and two from 600px.
 */
export function SpecialtyPicker({
  role,
  value,
  onChange,
  legend,
  hint,
  disabled,
}: {
  role: StaffRole;
  value: StaffSpecialty[];
  onChange: (next: StaffSpecialty[]) => void;
  legend: string;
  hint?: string;
  disabled?: boolean;
}) {
  const te = useTranslations("enums");
  const uid = useId();
  const group = specialtyGroup(role);

  const toggle = (s: StaffSpecialty, checked: boolean) => {
    if (s === "all") return onChange(checked ? ["all"] : []);
    const rest = value.filter((v) => v !== "all" && v !== s);
    onChange(checked ? [...rest, s] : rest);
  };

  return (
    <fieldset className="min-w-0 space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="grid grid-cols-1 gap-2 min-[600px]:grid-cols-2">
        {STAFF_SPECIALTIES.map((s) => {
          const id = `${uid}-${s}`;
          const checked = value.includes(s);
          return (
            <label
              key={s}
              htmlFor={id}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                "focus-within:ring-2 focus-within:ring-gold",
                checked ? "border-gold bg-gold/10" : "border-border hover:bg-muted",
                disabled && "cursor-not-allowed opacity-60",
                s === "all" && "min-[600px]:col-span-2",
              )}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => toggle(s, e.target.checked)}
                className="h-4 w-4 shrink-0 accent-gold"
              />
              <span className="min-w-0 break-words">{enumLabel(te, group, s)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
