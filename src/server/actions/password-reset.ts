"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import {
  RECOVERY_COOKIE,
  RESET_CONFIRM_PATH,
  localePath,
  safeLocale,
} from "@/lib/auth/password-reset";

export type ForgotState = { ok?: true; error?: string } | undefined;
export type ResetState = { error?: string } | undefined;

/** Origin of the current request (so the link returns to the same site/preview); falls back to NEXT_PUBLIC_SITE_URL. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return siteConfig.url;
}

/**
 * Step 1 — send the reset link.
 * Always answers the same "if the account exists…" message, so it never reveals which e-mails are registered.
 * Supabase itself rate-limits (one request per e-mail per ~60s + project e-mail quota).
 */
export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "errInvalidEmail" };
  const locale = safeLocale(formData.get("locale"));

  const supabase = await createClient();
  const redirectTo = `${await requestOrigin()}${RESET_CONFIRM_PATH}?locale=${locale}`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  if (error) {
    console.error("[reset] request", error.status, error.code ?? error.message);
    // Project-wide e-mail quota (Supabase built-in SMTP allows only a few e-mails per hour → use custom SMTP).
    if (error.code === "over_email_send_rate_limit") return { error: "errResetEmailQuota" };
    // Same e-mail asked again within ~60 seconds.
    if (error.status === 429 || /rate_limit/.test(error.code ?? "")) return { error: "errResetRateLimit" };
    return { error: "errResetFailed" };
  }
  return { ok: true };
}

/**
 * Step 2 — set the new password. Requires the recovery session AND the recovery flag
 * set by /api/auth/confirm (a normal logged-in session cannot use this page; it uses /profile).
 * Afterwards every session is signed out (incl. any attacker's) and the user logs in again.
 */
export async function completePasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const locale = safeLocale(formData.get("locale"));
  const cookieStore = await cookies();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || cookieStore.get(RECOVERY_COOKIE)?.value !== "1") return { error: "errResetSession" };

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    return { error: issue === "errPasswordMismatch" ? "errPasswordMismatch" : "errPasswordShort" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[reset] update", error.code ?? error.message);
    if (error.code === "same_password") return { error: "errSamePassword" };
    if (error.code === "weak_password") return { error: "errWeakPassword" };
    if (error.code === "session_not_found" || error.status === 401) return { error: "errResetSession" };
    return { error: "errResetFailed" };
  }

  cookieStore.delete(RECOVERY_COOKIE);
  await supabase.auth.signOut({ scope: "global" });
  redirect(`${localePath(locale, "/login")}?reset=1`);
}
