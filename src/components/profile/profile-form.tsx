"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateMyProfile } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = {
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  first_name_en?: string | null;
  last_name_en?: string | null;
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: { ar?: string } | null;
  social?: Record<string, string> | null;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const t = useTranslations("profile");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const s = initial.social ?? {};

  return (
    <form
      action={(fd) =>
        start(async () => {
          setMsg(null); setErr(null);
          const res = await updateMyProfile(fd);
          if (res?.ok) setMsg(t("saved"));
          else setErr(res?.error ? t("error") : t("error"));
        })
      }
      className="space-y-6 rounded-lg border border-border bg-card p-6"
    >
      <h2 className="font-semibold">{t("personal")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="first_name_ar">{t("firstNameAr")}</Label>
          <Input id="first_name_ar" name="first_name_ar" defaultValue={initial.first_name_ar ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name_ar">{t("lastNameAr")}</Label>
          <Input id="last_name_ar" name="last_name_ar" defaultValue={initial.last_name_ar ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="first_name_en">{t("firstNameEn")}</Label>
          <Input id="first_name_en" name="first_name_en" defaultValue={initial.first_name_en ?? ""} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name_en">{t("lastNameEn")}</Label>
          <Input id="last_name_en" name="last_name_en" defaultValue={initial.last_name_en ?? ""} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" name="phone" defaultValue={initial.phone ?? ""} dir="ltr" inputMode="tel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" defaultValue={initial.email ?? ""} dir="ltr" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="avatar_url">{t("avatarUrl")}</Label>
          <Input id="avatar_url" name="avatar_url" defaultValue={initial.avatar_url ?? ""} dir="ltr" placeholder="https://…" />
          <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bio">{t("bio")}</Label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={initial.bio?.ar ?? ""}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <h2 className="font-semibold">{t("social")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["instagram", "facebook", "x", "whatsapp", "youtube"] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={k}>{t(k)}</Label>
            <Input id={k} name={k} defaultValue={s[k] ?? ""} dir="ltr" />
          </div>
        ))}
      </div>

      {msg && <p className="text-sm text-success">{msg}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button type="submit" disabled={pending}>{t("save")}</Button>
    </form>
  );
}
