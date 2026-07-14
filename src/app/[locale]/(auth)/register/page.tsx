import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const { data: coachRows } = await supabase
    .from("profiles")
    .select("id, display_name, first_name_ar, last_name_ar")
    .eq("role", "coach")
    .eq("status", "active")
    .order("display_name");
  const coaches = (coachRows ?? []).map((c: any) => ({
    id: c.id,
    name: c.display_name ?? [c.first_name_ar, c.last_name_ar].filter(Boolean).join(" ") ?? "—",
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-gold">{t("register")}</h1>
      <p className="mt-2 text-muted-foreground">{t("registerTagline")}</p>
      <div className="mt-8">
        <RegisterForm coaches={coaches} />
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
