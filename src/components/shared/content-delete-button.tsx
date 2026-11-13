"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { deleteContent, getDeletionImpact } from "@/server/actions/content-manage";
import { errorLabel } from "@/lib/i18n/labels";
import type { ContentType } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";

type Impact = { count: number; needsApproval: boolean };

/**
 * Delete with an explicit confirmation (PR-11). Before confirming, the user is told how many
 * registrations/payments exist; for a creator that means the delete goes to an admin for approval.
 */
export function ContentDeleteButton({ type, id, title }: { type: ContentType; id: string; title: string }) {
  const t = useTranslations("manage");
  const tErr = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<"deleted" | "requested" | null>(null);
  const [loading, startLoad] = useTransition();
  const [pending, start] = useTransition();

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) return;
    setErr(null);
    setDone(null);
    setReason("");
    setImpact(null);
    startLoad(async () => {
      const res = await getDeletionImpact(type, id);
      if (res.ok) setImpact({ count: res.count ?? 0, needsApproval: !!res.needsApproval });
      else setErr(errorLabel(tErr, res.error));
    });
  };

  const confirm = () =>
    start(async () => {
      setErr(null);
      const res = await deleteContent(type, id, reason);
      if (res.ok) setDone(res.result ?? "deleted");
      else setErr(errorLabel(tErr, res.error));
    });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteTitle")}
      trigger={
        <Button type="button" size="sm" variant="outline" className="text-danger hover:text-danger" aria-label={`${t("delete")}: ${title}`}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t("delete")}
        </Button>
      }
      className="max-w-md"
    >
      <div className="space-y-4 text-sm">
        <p className="font-medium break-words">{title}</p>

        {done ? (
          <p role="status" className="rounded-md bg-success/10 p-3 text-success">
            {done === "requested" ? t("requestedDone") : t("deletedDone")}
          </p>
        ) : loading || (!impact && !err) ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("checking")}
          </p>
        ) : impact ? (
          impact.count === 0 ? (
            <p className="text-muted-foreground">{t("confirmNoRegs")}</p>
          ) : impact.needsApproval ? (
            <div className="space-y-3">
              <p className="rounded-md bg-warning/10 p-3 text-warning">{t("warnNeedsApproval", { count: impact.count })}</p>
              <div className="space-y-1.5">
                <Label htmlFor={`del-reason-${id}`}>{t("reason")}</Label>
                <textarea
                  id={`del-reason-${id}`}
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t("reasonPlaceholder")}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <p className="rounded-md bg-warning/10 p-3 text-warning">{t("warnAdmin", { count: impact.count })}</p>
          )
        ) : null}

        {err && <p role="alert" className="text-danger">{err}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {done ? (
            <Button type="button" onClick={() => setOpen(false)}>{t("close")}</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button type="button" variant="destructive" disabled={pending || loading || !impact} onClick={confirm}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {impact?.needsApproval ? t("sendRequest") : t("confirmDelete")}
              </Button>
            </>
          )}
        </div>
      </div>
    </FormDialog>
  );
}

