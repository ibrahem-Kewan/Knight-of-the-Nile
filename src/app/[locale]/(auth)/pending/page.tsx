import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PendingPage() {
  const t = await getTranslations("auth");
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
        <Clock className="h-8 w-8 text-gold" />
      </div>
      <h1 className="font-display text-2xl text-gold">{t("register")}</h1>
      <p className="mt-3 text-muted-foreground">{t("pending")}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
