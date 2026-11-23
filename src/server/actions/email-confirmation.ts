"use server";

import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { safeLocale } from "@/lib/auth/password-reset";
import { requestOrigin, VERIFY_EMAIL_PATH } from "@/lib/auth/request-origin";

export type ResendState = { ok?: true; error?: string } | undefined;

/** Builds the confirmation link target for the current language. */
export async function confirmRedirectTo(): Promise<string> {
  const locale = safeLocale(await getLocale());
  return `${await requestOrigin()}${VERIFY_EMAIL_PATH}?locale=${locale}`;
}

/**
 * Sends the sign-up confirmation e-mail again.
 * Always answers the same way for a valid address (never reveals which e-mails are registered).
 */
export async function resendConfirmation(email: string): Promise<ResendState> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { error: "errInvalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: await confirmRedirectTo() },
  });
  if (error) {
    console.error("[confirm] resend", error.status, error.code ?? error.message);
    if (error.code === "over_email_send_rate_limit") return { error: "errResetEmailQuota" };
    if (error.status === 429 || /rate_limit/.test(error.code ?? "")) return { error: "errResendRateLimit" };
    return { error: "errResendFailed" };
  }
  return { ok: true };
}
