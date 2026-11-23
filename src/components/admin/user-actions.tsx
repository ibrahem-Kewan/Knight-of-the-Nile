"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { errorLabel } from "@/lib/i18n/labels";
import {
  approveUser, rejectUser, setUserStatus, setUserRole, setUserSpecialties, deleteUser,
} from "@/server/actions/admin";
import { isStaffRole, type StaffRole, type StaffSpecialty } from "@/lib/staff/specialties";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/form-dialog";
import { SpecialtyPicker } from "@/components/shared/specialty-picker";
import { Check, X, Ban, RotateCcw, Trash2, Shield, ShieldOff, Pencil } from "lucide-react";

type Role = "super_admin" | "admin" | "coach" | "judge" | "athlete";

// What the role dialog is doing: assign a coach/judge role (picker), edit specialties of the
// current role, or confirm a switch to athlete (which removes the specialties).
type Dlg = { kind: "assign" | "edit"; role: StaffRole } | { kind: "toAthlete" } | null;

const roleLabelKey: Record<StaffRole, string> = { coach: "roleCoach", judge: "roleJudge" };

export function UserActions({
  id, role, status, isSelf, viewerIsSuper, specialties = [],
}: {
  id: string; role: Role; status: string; isSelf: boolean; viewerIsSuper: boolean;
  specialties?: StaffSpecialty[];
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [picked, setPicked] = useState<StaffSpecialty[]>([]);
  const [dlgErr, setDlgErr] = useState<string | null>(null);
  const label = (code: string) => (t.has(code) ? t(code) : errorLabel(te, code));
  const exec = async (fn: () => Promise<{ ok?: boolean; error?: string }>) => {
    const r = await fn();
    setErr(r.error ? label(r.error) : null);
    return r;
  };

  const openDialog = (next: Exclude<Dlg, null>) => {
    setDlgErr(null);
    setErr(null);
    // keep the current selection when the person already holds this role; otherwise start empty (required choice)
    setPicked(next.kind !== "toAthlete" && next.role === role ? specialties : []);
    setDlg(next);
  };
  const onRoleSelect = (value: string) => {
    if (value === role) return;
    if (value === "athlete") openDialog({ kind: "toAthlete" });
    else if (isStaffRole(value)) openDialog({ kind: "assign", role: value });
  };
  const confirmDialog = () => {
    if (!dlg) return;
    start(async () => {
      setDlgErr(null);
      const r =
        dlg.kind === "toAthlete"
          ? await setUserRole(id, "athlete")
          : dlg.kind === "assign"
            ? await setUserRole(id, dlg.role, picked)
            : await setUserSpecialties(id, picked);
      if (r.error) setDlgErr(label(r.error));
      else setDlg(null);
    });
  };
  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) => () => start(async () => { await exec(fn); });

  if (role === "super_admin") {
    return <span className="text-xs text-muted-foreground">{isSelf ? t("you") : t("mainAdmin")}</span>;
  }

  const isAdminTarget = role === "admin";
  const canManageAdmin = viewerIsSuper;        // only super manages admins
  const canActOnTarget = !isAdminTarget || canManageAdmin;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "pending_approval" && canActOnTarget && (
        <>
          <Button size="sm" disabled={pending} onClick={run(() => approveUser(id))}>
            <Check className="h-3.5 w-3.5" /> {t("approve")}
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={run(() => rejectUser(id))}>
            <X className="h-3.5 w-3.5" /> {t("reject")}
          </Button>
        </>
      )}

      {status === "active" && canActOnTarget && !isSelf && (
        <Button size="sm" variant="outline" disabled={pending} onClick={run(() => setUserStatus(id, "suspended"))}>
          <Ban className="h-3.5 w-3.5" /> {t("suspend")}
        </Button>
      )}
      {status === "suspended" && canActOnTarget && (
        <Button size="sm" variant="outline" disabled={pending} onClick={run(() => setUserStatus(id, "active"))}>
          <RotateCcw className="h-3.5 w-3.5" /> {t("activate")}
        </Button>
      )}

      {/* role assignment for non-admin targets (any admin). Coach/judge open a specialties dialog
          first (PR-18); the select stays controlled so cancelling returns to the previous role. */}
      {!isAdminTarget && !isSelf && (
        <select
          aria-label={t("role")}
          value={role}
          disabled={pending}
          onChange={(e) => onRoleSelect(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="athlete">{t("roleAthlete")}</option>
          <option value="coach">{t("roleCoach")}</option>
          <option value="judge">{t("roleJudge")}</option>
        </select>
      )}
      {!isAdminTarget && !isSelf && isStaffRole(role) && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => openDialog({ kind: "edit", role })}>
          <Pencil className="h-3.5 w-3.5" aria-hidden /> {t("editSpecialties")}
        </Button>
      )}

      {/* admin promotion / removal — super only */}
      {viewerIsSuper && !isSelf && !isAdminTarget && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={run(() => setUserRole(id, "admin"))}>
          <Shield className="h-3.5 w-3.5" /> {t("makeAdmin")}
        </Button>
      )}
      {viewerIsSuper && isAdminTarget && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={run(() => setUserRole(id, "athlete"))}>
          <ShieldOff className="h-3.5 w-3.5" /> {t("removeAdmin")}
        </Button>
      )}

      {err && <p role="alert" className="w-full text-xs text-danger break-words">{err}</p>}

      <FormDialog
        open={dlg !== null}
        onOpenChange={(o) => { if (!o && !pending) setDlg(null); }}
        title={
          dlg?.kind === "edit" ? t("editSpecialties")
            : dlg?.kind === "assign" ? t("pickSpecialties")
            : t("confirmToAthleteTitle")
        }
        description={
          dlg && dlg.kind !== "toAthlete" ? t("specialtiesFor", { role: t(roleLabelKey[dlg.role]) }) : undefined
        }
        className="max-w-lg"
      >
        <div className="space-y-4">
          {dlg && dlg.kind !== "toAthlete" ? (
            <SpecialtyPicker
              role={dlg.role}
              value={picked}
              onChange={setPicked}
              legend={t("specialties")}
              hint={t("specialtiesRequiredHint")}
              disabled={pending}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("specialtiesRemovedNote")}</p>
          )}
          {dlgErr && <p role="alert" className="text-sm text-danger break-words">{dlgErr}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setDlg(null)}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending || (dlg !== null && dlg.kind !== "toAthlete" && picked.length === 0)}
              onClick={confirmDialog}
            >
              {dlg?.kind === "edit" ? tc("save") : t("confirmAssign")}
            </Button>
          </div>
        </div>
      </FormDialog>

      {/* delete */}
      {canActOnTarget && !isSelf && (
        <Button
          size="sm" variant="destructive" disabled={pending}
          onClick={() => { if (confirm(t("confirmDelete"))) start(async () => { await exec(() => deleteUser(id)); }); }}
        >
          <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
        </Button>
      )}
    </div>
  );
}
