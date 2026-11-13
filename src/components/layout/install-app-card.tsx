"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getServerSnapshot, getSnapshot, promptInstall, subscribe } from "@/lib/pwa/install-prompt";

/**
 * "Install the app" card pinned to the bottom of the mobile menu.
 * Phones only; hidden when already running as the installed app.
 * Android → native install dialog. iPhone → inline Share → Add to Home Screen steps
 * (Safari offers no programmatic install).
 */
export function InstallAppCard() {
  const t = useTranslations("pwa");
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [stepsOpen, setStepsOpen] = useState(false);

  if (!s.phone || s.standalone) return null;

  if (s.installed) {
    return (
      <Shell>
        <p role="status" className="flex items-start gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep dark:text-gold" aria-hidden />
          {t("installed")}
        </p>
      </Shell>
    );
  }

  const ios = s.platform === "ios";
  if (!ios && !s.canPrompt) return null;

  const steps = [
    { icon: Share, text: t("iosStep1") },
    { icon: SquarePlus, text: t("iosStep2") },
    { icon: CheckCircle2, text: t("iosStep3") },
  ];

  return (
    <Shell>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl shadow-sm ring-1 ring-gold/40"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-foreground">{t("title")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {ios ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11 w-full border-gold/50"
            aria-expanded={stepsOpen}
            aria-controls="install-ios-steps"
            onClick={() => setStepsOpen((v) => !v)}
          >
            <Download className="h-4 w-4" aria-hidden />
            {stepsOpen ? t("iosHide") : t("iosShow")}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform motion-reduce:transition-none", stepsOpen && "rotate-180")}
              aria-hidden
            />
          </Button>
          {stepsOpen && (
            <ol id="install-ios-steps" aria-label={t("iosStepsLabel")} className="mt-3 flex flex-col gap-2">
              {steps.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-background/70 px-3 py-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{text}</span>
                  <Icon className="h-5 w-5 shrink-0 text-nile dark:text-gold-soft" aria-hidden />
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <Button type="button" className="mt-3 h-11 w-full" onClick={() => void promptInstall()}>
          <Download className="h-4 w-4" aria-hidden />
          {t("install")}
        </Button>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card to-nile/10 p-3">
        {children}
      </div>
    </div>
  );
}
