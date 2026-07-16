import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InstapayCheckout } from "@/components/checkout/instapay-checkout";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string; id?: string; amount?: string; title?: string; currency?: string }>;
}) {
  await requireAuth();
  const sp = await searchParams;
  const t = await getTranslations("checkout");
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("payment_settings")
    .select("instapay_name, instapay_handle, instapay_phone")
    .eq("id", 1)
    .maybeSingle();

  const context = (["course", "tournament", "event"].includes(sp.context ?? "") ? sp.context : "course") as
    | "course"
    | "tournament"
    | "event";
  const amount = Number(sp.amount ?? 0) || 0;

  return (
    <div className="container max-w-xl py-10">
      <h1 className="mb-6 font-display text-3xl text-gold">{t("title")}</h1>
      <InstapayCheckout
        context={context}
        refId={sp.id ?? ""}
        amount={amount}
        currency={sp.currency ?? "EGP"}
        title={sp.title ?? t("title")}
        settings={(settings ?? {}) as any}
      />
    </div>
  );
}
