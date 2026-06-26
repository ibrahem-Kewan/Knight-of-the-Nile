import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <div>
      <h1 className="font-display text-3xl text-gold">{t("register")}</h1>
      <p className="mt-2 text-muted-foreground">{t("registerTagline")}</p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-nile hover:underline">
          {t("login")}
        </Link>
      </p>
    </div>
  );
}
