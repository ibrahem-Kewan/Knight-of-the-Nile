import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center font-display text-2xl text-gold">
            {t("login")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/register" className="text-nile hover:underline">
              {tn("register")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
