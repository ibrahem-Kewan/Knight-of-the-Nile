"use client";

import type { NavItem } from "@/config/navigation";
import { DashboardNavList } from "@/components/layout/dashboard-nav";

/** Desktop sidebar (lg+). Smaller screens use <DashboardMobileNav />. */
export function DashboardSidebar({ items, label }: { items: NavItem[]; label: string }) {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-border bg-card lg:block">
      <nav aria-label={label} className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto p-4">
        <DashboardNavList items={items} />
      </nav>
    </aside>
  );
}
