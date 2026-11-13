"use client";

import type { NavItem } from "@/config/navigation";
import { DashboardNavList } from "@/components/layout/dashboard-nav";

/**
 * Desktop sidebar (lg+). Smaller screens use <DashboardMobileNav />.
 *
 * The panel is a self-contained sticky card (not a full-height column), so its
 * look no longer depends on how tall the page content is: short pages used to
 * end the card's background mid-screen while long pages stretched it.
 */
export function DashboardSidebar({
  items,
  label,
  roleLabel,
}: {
  items: NavItem[];
  label: string;
  roleLabel?: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 py-6 lg:block xl:w-72">
      <nav
        aria-label={label}
        className="sticky top-[5.5rem] flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          {roleLabel ? (
            <span className="truncate rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-gold-deep dark:text-gold">
              {roleLabel}
            </span>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
          <DashboardNavList items={items} />
        </div>
      </nav>
    </aside>
  );
}
