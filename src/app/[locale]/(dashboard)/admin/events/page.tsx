import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EventsManager } from "@/components/events/events-manager";

export default async function AdminEventsPage() {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();

  const [{ data: sports }, { data: events }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase
      .from("events")
      .select("id, title_ar, title_en, status, venue")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return <EventsManager sports={(sports ?? []) as any} events={(events ?? []) as any} />;
}
