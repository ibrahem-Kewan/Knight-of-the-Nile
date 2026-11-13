"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle, Award, CalendarDays, CheckCircle, Circle, ClipboardList, Crosshair, Dumbbell, Globe,
  GraduationCap, IdCard, LayoutDashboard, ListChecks, MapPin, Medal, Newspaper, ScrollText, Target,
  Trash2, Trophy, UserCog, Users, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import { usePathname, Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/navigation";

// Explicit icon map (instead of `import * as Icons`) keeps the client bundle small.
const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, Award, CalendarDays, CheckCircle, ClipboardList, Crosshair, Dumbbell, Globe, GraduationCap,
  IdCard, LayoutDashboard, ListChecks, MapPin, Medal, Newspaper, ScrollText, Target, Trash2, Trophy, UserCog, Users, UsersRound, Wallet,
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
  const t = useTranslations("dashNav");
  const pathname = usePathname();

  return (
    <ul className={cn("flex flex-col gap-0.5", className)}>
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
                "group relative flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                // Start-edge indicator (flips automatically in RTL via logical `start`).
                "before:absolute before:inset-y-2.5 before:start-0 before:w-1 before:rounded-full before:bg-gold before:transition-opacity",
                active
                  ? "bg-primary/10 font-semibold text-gold-deep before:opacity-100 dark:text-gold"
                  : "font-medium text-foreground/75 before:opacity-0 hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                  active
                    ? "bg-gold text-ink shadow-sm"
                    : "bg-muted/50 text-muted-foreground group-hover:bg-primary/15 group-hover:text-gold-deep dark:group-hover:text-gold",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="truncate">{t(item.labelKey as never)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
