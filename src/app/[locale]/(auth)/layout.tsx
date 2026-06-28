import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { AuthSlideshow } from "@/components/home/auth-slideshow";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-ink via-ink to-nile p-10 text-sand md:flex">
        <Link href="/" className="flex items-center gap-2 font-display text-xl text-gold">
          <span className="inline-block h-9 w-9 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
          فارس النيل
        </Link>
        <div className="mx-auto w-full max-w-sm">
          <AuthSlideshow />
        </div>
        <p className="font-display text-lg text-gold">{t("brandLine")}</p>
      </div>
      {/* Form side */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
