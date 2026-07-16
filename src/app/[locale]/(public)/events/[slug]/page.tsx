import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { localized } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { EventRegisterControl } from "@/components/events/event-register-control";

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("events");
  const ck = await getTranslations("checkout");
  const supabase = await createClient();

  const { data: e } = await supabase
    .from("events")
    .select("*, sports(name_ar,name_en)")
    .eq("slug", slug)
    .single();

  if (!e || e.status === "draft") notFound();

  const title = locale === "ar" ? e.title_ar : e.title_en ?? e.title_ar;
  const isOpen = e.status === "registration_open";
  const me = await getProfile();

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-4 flex items-center gap-3">
        <Badge variant="secondary">{t("badge")}</Badge>
        {e.venue && <span className="text-sm text-muted-foreground">{e.venue}</span>}
      </div>
      <h1 className="mb-2 font-display text-3xl text-gold">{title}</h1>
      <p className="mb-6 whitespace-pre-line text-muted-foreground">
        {localized(e.description as never, locale)}
      </p>
      <dl className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("start")}</dt>
          <dd>{e.start_date ? new Date(e.start_date).toLocaleDateString(locale) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("end")}</dt>
          <dd>{e.end_date ? new Date(e.end_date).toLocaleDateString(locale) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("max")}</dt>
          <dd>{e.max_participants ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("fees")}</dt>
          <dd>{Number(e.fees) > 0 ? `${e.fees} ${e.currency}` : t("free")}</dd>
        </div>
      </dl>

      {isOpen && me && me.status === "active" && <EventRegisterControl eventId={e.id} />}
      {Number(e.fees) > 0 && me && (
        <div className="mt-4">
          <Button asChild size="lg" variant="outline">
            <Link href={`/checkout?context=event&id=${e.id}&amount=${e.fees}&currency=${e.currency}&title=${encodeURIComponent(title)}`}>
              {ck("pay")}
            </Link>
          </Button>
        </div>
      )}
      {isOpen && !me && (
        <Button asChild size="lg">
          <Link href="/login">{t("mustLogin")}</Link>
        </Button>
      )}
    </div>
  );
}
