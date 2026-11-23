"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { errorLabel } from "@/lib/i18n/labels";
import { approveRoleRequest, rejectRoleRequest } from "@/server/actions/admin";
import type { StaffRole, StaffSpecialty } from "@/lib/staff/specialties";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/form-dialog";
import { SpecialtyPicker } from "@/components/shared/specialty-picker";
import { Check, X } from "lucide-react";

/**
 * Approve / reject a coach-judge upgrade request. Approving opens a dialog with the requester's
 * proposed specialties pre-selected; the admin may adjust them before confirming (PR-18).
 */
export function RequestActions({
  id, role, suggested = [],
}: {
  id: string; role: StaffRole; suggested?: StaffSpecialty[];
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<StaffSpecialty[]>(suggested);
  const [dlgErr, setDlgErr] = useState<string | null>(null);
  const label = (code: string) => (t.has(code) ? t(code) : errorLabel(te, code));

  const openApprove = () => {
    setPicked(suggested);
    setDlgErr(null);
    setErr(null);
    setOpen(true);
  };
  const confirm = () =>
    start(async () => {
      setDlgErr(null);
      const r = await approveRoleRequest(id, picked);
      if (r.error) setDlgErr(label(r.error));
      else setOpen(false);
    });
  const reject = () =>
    start(async () => {
      const r = await rejectRoleRequest(id);
      setErr(r.error ? label(r.error) : null);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={openApprove}>
        <Check className="h-3.5 w-3.5" /> {t("approve")}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={reject}>
        <X className="h-3.5 w-3.5" /> {t("reject")}
      </Button>
      {err && <p role="alert" className="w-full text-xs text-danger break-words">{err}</p>}

      <FormDialog
        open={open}
        onOpenChange={(o) => { if (!o && !pending) setOpen(false); }}
        title={t("pickSpecialties")}
        description={t("specialtiesFor", { role: t(role === "coach" ? "roleCoach" : "roleJudge") })}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <SpecialtyPicker
            role={role}
            value={picked}
            onChange={setPicked}
            legend={t("specialties")}
            hint={suggested.length ? t("suggestedHint") : t("specialtiesRequiredHint")}
            disabled={pending}
          />
          {dlgErr && <p role="alert" className="text-sm text-danger break-words">{dlgErr}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="button" disabled={pending || picked.length === 0} onClick={confirm}>
              {t("confirmAssign")}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
