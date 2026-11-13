import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "@/lib/auth/password-reset";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle"), robots: { index: false } };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Only reachable through a verified recovery link (session + short-lived flag from /api/auth/confirm).
  const valid = !!user && (await cookies()).get(RECOVERY_COOKIE)?.value === "1";

  if (!valid) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
          <KeyRound className="h-8 w-8 text-danger" aria-hidden />
        </div>
        <h1 className="font-display text-2xl text-gold">{t("resetLinkInvalidTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("resetLinkInvalid")}</p>
        <Button asChild className="mt-6">
          <Link href="/forgot-password">{t("requestNewLink")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-gold">{t("resetTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t.rich("resetTagline", {
          email: user.email ?? "",
          b: (chunks) => (
            <bdi dir="ltr" className="font-medium text-foreground">
              {chunks}
            </bdi>
          ),
        })}</p>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
