import { headers } from "next/headers";
import { siteConfig } from "@/config/site";

/** Origin of the current request (so e-mailed links return to the same site/preview); falls back to the site URL. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return siteConfig.url;
}

/** Route handler that verifies the sign-up confirmation e-mail (outside [locale]; /api skips the intl middleware). */
export const VERIFY_EMAIL_PATH = "/api/auth/verify-email";
