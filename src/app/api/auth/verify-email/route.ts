import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { localePath, safeLocale } from "@/lib/auth/password-reset";

/**
 * Landing point of the sign-up confirmation e-mail.
 * Supports both link styles:
 *  - token_hash + type=signup|email  (recommended template — works on any device/browser)
 *  - code                            (default template, PKCE — same browser that registered)
 * Success → the user is signed in and lands on the athlete dashboard. Failure → /login?confirm=error
 * (where the user can ask for a new link).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const locale = safeLocale(searchParams.get("locale"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const fail = () => NextResponse.redirect(new URL(`${localePath(locale, "/login")}?confirm=error`, origin));
  if (searchParams.get("error") || searchParams.get("error_code")) return fail();

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && (type === "signup" || type === "email")) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) console.error("[confirm] verifyOtp", error.code ?? error.message);
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[confirm] exchangeCode", error.code ?? error.message);
    ok = !error;
  }

  if (!ok) return fail();
  return NextResponse.redirect(new URL(localePath(locale, "/athlete"), origin));
}
