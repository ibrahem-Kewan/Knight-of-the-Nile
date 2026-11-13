"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { uploadMyAvatar, removeMyAvatar } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { AVATAR_MAX_SOURCE_BYTES, AVATAR_SIZE, AVATAR_TYPES } from "@/lib/profile/avatar";

/** Center-crops to a square and resizes to AVATAR_SIZE px, returns WebP (or JPEG fallback). */
async function toSquareImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const out = Math.min(AVATAR_SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
    const webp = await encode("image/webp");
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await encode("image/jpeg");
    if (!jpeg) throw new Error("encode");
    return jpeg;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarUploader({ url, fallback }: { url: string | null; fallback: string }) {
  const t = useTranslations("profile");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const showError = (code?: string) =>
    setErr(code && t.has(code) ? t(code) : t("error"));

  const pick = () => inputRef.current?.click();

  const onFile = (file: File | undefined) => {
    setMsg(null);
    setErr(null);
    if (!file) return;
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return showError("avatarType");
    if (file.size > AVATAR_MAX_SOURCE_BYTES) return showError("avatarTooLarge");

    start(async () => {
      let blob: Blob;
      try {
        blob = await toSquareImage(file);
      } catch {
        return showError("avatarType");
      }
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const fd = new FormData();
      fd.append("avatar", new File([blob], `avatar.${ext}`, { type: blob.type }));
      const res = await uploadMyAvatar(fd);
      if (res?.ok) {
        setPreview(URL.createObjectURL(blob));
        setMsg(t("avatarSaved"));
        router.refresh();
      } else showError(res?.error);
    });
  };

  const onRemove = () => {
    setMsg(null);
    setErr(null);
    start(async () => {
      const res = await removeMyAvatar();
      if (res?.ok) {
        setPreview(null);
        setMsg(t("avatarRemoved"));
        router.refresh();
      } else showError(res?.error);
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={pick}
        disabled={pending}
        aria-label={preview ? t("avatarChange") : t("avatarUpload")}
        className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-gold/40 transition hover:ring-gold focus-visible:outline-none focus-visible:ring-gold disabled:cursor-wait"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t("avatar")} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gold/15 text-3xl font-bold text-gold">
            {fallback}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-sand opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="h-6 w-6" aria-hidden />
        </span>
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/60 text-sand">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </span>
        )}
      </button>

      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">{t("avatar")}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={pick} disabled={pending}>
            <Upload className="h-4 w-4" aria-hidden />
            {preview ? t("avatarChange") : t("avatarUpload")}
          </Button>
          {preview && (
            <Button type="button" size="sm" variant="outline" onClick={onRemove} disabled={pending}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("avatarRemove")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
        <p aria-live="polite" className="text-xs">
          {pending && <span className="text-muted-foreground">{t("avatarUploading")}</span>}
          {!pending && msg && <span className="text-success">{msg}</span>}
          {!pending && err && <span role="alert" className="text-danger">{err}</span>}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
