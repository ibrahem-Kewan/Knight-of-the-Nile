import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("forgotTitle"), robots: { index: false } };
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("auth");
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="font-display text-3xl text-gold">{t("forgotTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("forgotTagline")}</p>
      {error === "link" && (
        <p role="alert" className="mt-6 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {t("resetLinkInvalid")}
        </p>
      )}
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-nile hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
