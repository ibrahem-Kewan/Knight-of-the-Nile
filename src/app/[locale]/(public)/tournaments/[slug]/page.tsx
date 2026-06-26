import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default async function TournamentDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: t } = await supabase
    .from("tournaments")
    .select("*, sports(name_ar,name_en)")
    .eq("slug", slug)
    .single();

  if (!t || t.status === "draft") notFound();

  const title = locale === "ar" ? t.title_ar : t.title_en ?? t.title_ar;

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-4 flex items-center gap-3">
        <Badge variant="secondary">{t.scope}</Badge>
        <span className="text-sm text-muted-foreground">{t.venue}</span>
      </div>
      <h1 className="mb-2 font-display text-3xl text-gold">{title}</h1>
      <p className="mb-6 whitespace-pre-line text-muted-foreground">
        {localized(t.description as never, locale)}
      </p>
      <dl className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5 text-sm">
        <div>
          <dt className="text-muted-foreground">تاريخ البداية</dt>
          <dd>{t.start_date ? new Date(t.start_date).toLocaleDateString(locale) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">تاريخ النهاية</dt>
          <dd>{t.end_date ? new Date(t.end_date).toLocaleDateString(locale) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">الحد الأقصى</dt>
          <dd>{t.max_participants ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">الرسوم</dt>
          <dd>{Number(t.fees) > 0 ? `${t.fees} ${t.currency}` : "مجاني"}</dd>
        </div>
      </dl>
      {t.status === "registration_open" && (
        <Button asChild size="lg">
          <Link href="/login">التسجيل في البطولة</Link>
        </Button>
      )}
    </div>
  );
}
