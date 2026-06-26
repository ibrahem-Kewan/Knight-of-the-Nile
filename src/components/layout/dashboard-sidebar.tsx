"use client";

import { useLocale } from "next-intl";
import { usePathname, Link } from "@/lib/i18n/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navigation";

export function DashboardSidebar({ items }: { items: NavItem[] }) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-e border-border bg-card md:block">
      <nav className="flex flex-col gap-1 p-4">
        {items.map((item) => {
          const Icon = (Icons[item.icon as keyof typeof Icons] ??
            Icons.Circle) as React.ComponentType<{ className?: string }>;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/15 text-gold-deep" : "text-foreground/80 hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {locale === "ar" ? item.labelAr : item.labelEn}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
