"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { updatePost } from "@/server/actions/content";
import { errorLabel, enumLabel } from "@/lib/i18n/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";

const TYPES = ["post", "article", "announcement"] as const;

/** Edit a post's title / type in a dialog (author or admin — PR-11). */
export function PostEditForm({
  post,
}: {
  post: { id: string; title_ar: string; title_en: string | null; type: string };
}) {
  const tm = useTranslations("manage");
  const tt = useTranslations("table");
  const te = useTranslations("enums");
  const tErr = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const fid = (k: string) => `${post.id}-p-${k}`;

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (v) setErr(null); }}
      title={tm("editTitle")}
      className="max-w-lg"
      trigger={
        <Button type="button" size="sm" variant="outline" aria-label={`${tm("edit")}: ${post.title_ar}`}>
          <Pencil className="h-3.5 w-3.5" aria-hidden /> {tm("edit")}
        </Button>
      }
    >
      <form
        action={(fd) =>
          start(async () => {
            setErr(null);
            const res = await updatePost(post.id, fd);
            if (res?.ok) setOpen(false);
            else setErr(errorLabel(tErr, res?.error));
          })
        }
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor={fid("title_ar")}>{tm("titleAr")}</Label>
          <Input id={fid("title_ar")} name="title_ar" required defaultValue={post.title_ar} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("title_en")}>{tm("titleEn")}</Label>
          <Input id={fid("title_en")} name="title_en" dir="ltr" defaultValue={post.title_en ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fid("type")}>{tt("type")}</Label>
          <select
            id={fid("type")}
            name="type"
            defaultValue={post.type}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>{enumLabel(te, "postType", ty)}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{tm("auditNote")}</p>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>{tm("save")}</Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tm("cancel")}</Button>
        </div>
      </form>
    </FormDialog>
  );
}
