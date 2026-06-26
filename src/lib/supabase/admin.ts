import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Service-role client. SERVER / EDGE ONLY. Bypasses RLS - never import in client code. */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
