import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/contact/contact-form";
import { Mail, MapPin, Instagram, Facebook, Youtube } from "lucide-react";

export default async function ContactPage() {
  const t = await getTranslations("contact");
  return (
    <div className="container grid gap-12 py-16 md:grid-cols-2">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-gold">{t("kicker")}</p>
        <h1 className="mt-2 font-display text-4xl text-gold">{t("title")}</h1>
        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{t("sub")}</p>

        <div className="mt-8 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">{t("emailLabel")}</h3>
            <a href="mailto:join@knightofthenile.com" className="mt-1 flex items-center gap-2 text-nile hover:underline">
              <Mail className="h-4 w-4" /> join@knightofthenile.com
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">{t("citiesLabel")}</h3>
            <p className="mt-1 flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> القاهرة · الأقصر · أسوان</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">{t("followLabel")}</h3>
            <div className="mt-2 flex gap-3">
              <a href="#" aria-label="Instagram" className="rounded-md border border-border p-2 hover:text-gold"><Instagram className="h-5 w-5" /></a>
              <a href="#" aria-label="Facebook" className="rounded-md border border-border p-2 hover:text-gold"><Facebook className="h-5 w-5" /></a>
              <a href="#" aria-label="YouTube" className="rounded-md border border-border p-2 hover:text-gold"><Youtube className="h-5 w-5" /></a>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 md:p-8">
        <ContactForm />
      </div>
    </div>
  );
}
