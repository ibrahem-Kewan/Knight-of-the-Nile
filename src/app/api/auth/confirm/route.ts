import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_MAX_AGE,
  localePath,
  safeLocale,
} from "@/lib/auth/password-reset";

/**
 * Landing point of the "reset password" e-mail.
 * Supports both Supabase link styles:
 *  - token_hash + type=recovery  (recommended e-mail template — works on any device/browser)
 *  - code                        (default template, PKCE — works in the browser that requested the link)
 * On success: recovery session cookies + a 15-min recovery flag → /reset-password.
 * On failure: → /forgot-password?error=link
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const locale = safeLocale(searchParams.get("locale"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const fail = () =>
    NextResponse.redirect(new URL(`${localePath(locale, "/forgot-password")}?error=link`, origin));

  // Supabase forwards its own errors (e.g. otp_expired) as query params.
  if (searchParams.get("error") || searchParams.get("error_code")) return fail();

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (error) console.error("[reset] verifyOtp", error.code ?? error.message);
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[reset] exchangeCode", error.code ?? error.message);
    ok = !error;
  }

  if (!ok) return fail();

  (await cookies()).set(RECOVERY_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RECOVERY_COOKIE_MAX_AGE,
  });

  return NextResponse.redirect(new URL(localePath(locale, "/reset-password"), origin));
}
