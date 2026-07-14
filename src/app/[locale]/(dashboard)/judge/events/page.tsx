import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EventsManager } from "@/components/events/events-manager";

export default async function JudgeEventsPage() {
  const me = await requireRole(["judge"]);
  const supabase = await createClient();

  // Judge manages own events plus any coach-created event.
  const { data: coaches } = await supabase.from("profiles").select("id").eq("role", "coach");
  const creators = [me.id, ...((coaches ?? []) as { id: string }[]).map((c) => c.id)];

  const [{ data: sports }, { data: events }] = await Promise.all([
    supabase.from("sports").select("id, name_ar, name_en").eq("is_active", true).order("sort_order"),
    supabase
      .from("events")
      .select("id, title_ar, title_en, status, venue")
      .in("created_by", creators)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return <EventsManager sports={(sports ?? []) as any} events={(events ?? []) as any} />;
}
