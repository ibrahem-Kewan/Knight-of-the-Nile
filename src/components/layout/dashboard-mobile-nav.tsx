"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, X } from "lucide-react";
import type { NavItem } from "@/config/navigation";
import { DashboardNavList, navIcon, useActiveNavItem } from "@/components/layout/dashboard-nav";

/**
 * Mobile / tablet (< lg) dashboard navigation: a sticky bar showing the current
 * section that opens a side drawer with every section of the dashboard.
 */
export function DashboardMobileNav({ items }: { items: NavItem[] }) {
  const t = useTranslations("dash");
  const tn = useTranslations("nav");
  const tl = useTranslations("dashNav");
  const [open, setOpen] = useState(false);
  const current = useActiveNavItem(items);

  if (!items.length) return null;
  const CurrentIcon = navIcon(current.icon);
  const currentLabel = tl(current.labelKey as never);

  return (
    <div className="sticky top-16 z-30 border-b border-border bg-background/90 px-4 py-2 backdrop-blur lg:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label={t("openSections")}
            className="flex h-11 w-full items-center gap-3 rounded-md border border-border bg-card px-3 text-start text-sm font-medium shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <CurrentIcon className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              <span className="text-muted-foreground">{t("sections")}: </span>
              {currentLabel}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 start-0 z-50 flex w-[85vw] max-w-xs flex-col border-e border-border bg-card shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out ltr:data-[state=open]:slide-in-from-left ltr:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-right"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <Dialog.Title className="font-display text-lg text-gold">{t("sections")}</Dialog.Title>
              <Dialog.Close
                aria-label={tn("close")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <X className="h-5 w-5" aria-hidden />
              </Dialog.Close>
            </div>
            <nav aria-label={t("sections")} className="flex-1 overflow-y-auto p-3">
              <DashboardNavList items={items} onNavigate={() => setOpen(false)} />
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
