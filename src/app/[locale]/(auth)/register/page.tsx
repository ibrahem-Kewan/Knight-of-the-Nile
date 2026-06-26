import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center font-display text-2xl text-gold">
            {t("register")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-nile hover:underline">
              {tn("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
