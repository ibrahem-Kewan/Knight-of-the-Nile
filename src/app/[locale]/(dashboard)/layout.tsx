import { requireAuth } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { dashboardNav } from "@/config/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  const items = dashboardNav[profile.role] ?? [];

  return (
    <div className="container flex gap-0 py-0">
      <DashboardSidebar items={items} />
      <section className="flex-1 p-6">{children}</section>
    </div>
  );
}
