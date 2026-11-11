"use client";

import { useLocale } from "next-intl";
import {
  AlertTriangle, Award, CalendarDays, CheckCircle, Circle, ClipboardList, Crosshair, Globe,
  GraduationCap, IdCard, LayoutDashboard, ListChecks, Medal, Newspaper, ScrollText, Target,
  Trophy, UserCog, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { usePathname, Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navigation";

// Explicit icon map (instead of `import * as Icons`) keeps the client bundle small.
const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, Award, CalendarDays, CheckCircle, ClipboardList, Crosshair, Globe, GraduationCap,
  IdCard, LayoutDashboard, ListChecks, Medal, Newspaper, ScrollText, Target, Trophy, UserCog, Users, Wallet,
};

export const navIcon = (name: string): LucideIcon => ICONS[name] ?? Circle;

/** A section root like "/admin" is active only on exact match; others also match nested paths. */
export function isNavActive(pathname: string, href: string) {
  if (pathname === href) return true;
  const isRoot = href.split("/").filter(Boolean).length === 1;
  return !isRoot && pathname.startsWith(`${href}/`);
}

export function useActiveNavItem(items: NavItem[]) {
  const pathname = usePathname();
  return items.find((i) => isNavActive(pathname, i.href)) ?? items[0];
}

export function DashboardNavList({
  items,
  onNavigate,
  className,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  className?: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const Icon = navIcon(item.icon);
        const active = isNavActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                active ? "bg-primary/15 text-gold-deep dark:text-gold" : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{locale === "ar" ? item.labelAr : item.labelEn}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
