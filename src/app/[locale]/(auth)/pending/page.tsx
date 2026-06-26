import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const t = useTranslations("auth");
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-10">
          <Clock className="h-12 w-12 text-gold" />
          <p className="text-lg font-medium">{t("pending")}</p>
          <Button asChild variant="outline">
            <Link href="/">العودة للرئيسية</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
