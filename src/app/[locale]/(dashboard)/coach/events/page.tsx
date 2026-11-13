import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withoutPendingDeletion } from "@/lib/content/state";
import { EventsManager, EVENT_MANAGE_COLUMNS } from "@/components/events/events-manager";

export default async function CoachEventsPage() {
  const me = await requireRole(["coach"]);
  const supabase = await createClient();

  const [{ data: sports }, { data: events }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase
      .from("events")
      .select(EVENT_MANAGE_COLUMNS)
      .eq("created_by", me.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return <EventsManager sports={(sports ?? []) as any} events={withoutPendingDeletion(events) as any} />;
}
