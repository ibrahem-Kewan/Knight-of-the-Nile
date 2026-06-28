"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  approveUser, rejectUser, setUserStatus, setUserRole, deleteUser,
} from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Check, X, Ban, RotateCcw, Trash2, Shield, ShieldOff } from "lucide-react";

type Role = "super_admin" | "admin" | "coach" | "judge" | "athlete";

export function UserActions({
  id, role, status, isSelf, viewerIsSuper,
}: {
  id: string; role: Role; status: string; isSelf: boolean; viewerIsSuper: boolean;
}) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => () => start(() => { void fn(); });

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

      {/* role assignment for non-admin targets (any admin) */}
      {!isAdminTarget && !isSelf && (
        <select
          aria-label={t("role")}
          defaultValue={role}
          disabled={pending}
          onChange={(e) => start(() => { void setUserRole(id, e.target.value as Role); })}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="athlete">{t("roleAthlete")}</option>
          <option value="coach">{t("roleCoach")}</option>
          <option value="judge">{t("roleJudge")}</option>
        </select>
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

      {/* delete */}
      {canActOnTarget && !isSelf && (
        <Button
          size="sm" variant="destructive" disabled={pending}
          onClick={() => { if (confirm(t("confirmDelete"))) start(() => { void deleteUser(id); }); }}
        >
          <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
        </Button>
      )}
    </div>
  );
}
