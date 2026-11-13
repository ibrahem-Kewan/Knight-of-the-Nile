"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { resolveDeletionRequest } from "@/server/actions/content-manage";
import { errorLabel } from "@/lib/i18n/labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";

/** Admin approves (soft delete) or rejects (item returns) a deletion request — PR-11. */
export function DeletionRequestActions({ requestId, title }: { requestId: string; title: string }) {
  const t = useTranslations("pages.deletionRequests");
  const tm = useTranslations("manage");
  const tErr = useTranslations("errors");
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const openAs = (m: "approve" | "reject") => {
    setMode(m);
    setNote("");
    setErr(null);
  };

  const submit = () =>
    start(async () => {
      if (mode === "reject" && !note.trim()) {
        setErr(t("noteRequired"));
        return;
      }
      const res = await resolveDeletionRequest(requestId, mode === "approve", note);
      if (res.ok) setMode(null);
      else setErr(errorLabel(tErr, res.error));
    });

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="destructive" onClick={() => openAs("approve")} aria-label={`${t("approve")}: ${title}`}>
          <Check className="h-3.5 w-3.5" aria-hidden /> {t("approve")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => openAs("reject")} aria-label={`${t("reject")}: ${title}`}>
          <X className="h-3.5 w-3.5" aria-hidden /> {t("reject")}
        </Button>
      </div>
      <FormDialog
        open={mode !== null}
        onOpenChange={(v) => { if (!v) setMode(null); }}
        title={mode === "approve" ? t("approveTitle") : t("rejectTitle")}
        className="max-w-md"
      >
        <div className="space-y-4 text-sm">
          <p className="font-medium break-words">{title}</p>
          <p className="text-muted-foreground">{mode === "approve" ? t("approveHint") : t("rejectHint")}</p>
          <div className="space-y-1.5">
            <Label htmlFor={`dr-note-${requestId}`}>{mode === "reject" ? t("noteRequiredLabel") : t("noteOptional")}</Label>
            <textarea
              id={`dr-note-${requestId}`}
              value={note}
              maxLength={500}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {err && <p role="alert" className="text-danger">{err}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMode(null)}>{tm("cancel")}</Button>
            <Button type="button" variant={mode === "approve" ? "destructive" : "default"} disabled={pending} onClick={submit}>
              {mode === "approve" ? t("approveConfirm") : t("rejectConfirm")}
            </Button>
          </div>
        </div>
      </FormDialog>
    </>
  );
}
