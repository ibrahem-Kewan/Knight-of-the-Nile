import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <div>
      <h1 className="font-display text-3xl text-gold">{t("welcomeBack")}</h1>
      <p className="mt-2 text-muted-foreground">{t("loginTagline")}</p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-nile hover:underline">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
