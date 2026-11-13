"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { InstallAppCard } from "@/components/layout/install-app-card";

/** Public site navigation for screens below lg (the desktop nav is hidden there). */
export function SiteMobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={t("openMenu")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 end-0 z-50 flex w-[85vw] max-w-xs flex-col border-s border-border bg-card shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out ltr:data-[state=open]:slide-in-from-right ltr:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-left"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <Dialog.Title className="font-display text-lg text-gold">{t("menu")}</Dialog.Title>
            <Dialog.Close
              aria-label={t("close")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X className="h-5 w-5" aria-hidden />
            </Dialog.Close>
          </div>
          <nav aria-label={t("menu")} className="flex-1 overflow-y-auto p-3">
            <ul className="flex flex-col gap-1">
              {[{ href: "/", label: t("home") }, ...links].map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                        active ? "bg-primary/15 text-gold-deep dark:text-gold" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <InstallAppCard />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
