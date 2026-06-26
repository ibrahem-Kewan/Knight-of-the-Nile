import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  // 1) i18n routing
  const response = intlMiddleware(request);

  // 2) refresh Supabase session cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
