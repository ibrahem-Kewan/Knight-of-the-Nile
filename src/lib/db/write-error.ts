/**
 * Maps a Supabase/PostgREST write error to a UI error code (translated under `errors.*`)
 * and logs the real cause server-side. Never return `error.message` to the UI.
 */
export type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null };

export function writeErrorCode(where: string, e: DbError): string {
  console.error(`[${where}] write failed`, { code: e.code, message: e.message, details: e.details, hint: e.hint });
  const msg = e.message ?? "";
  if (msg.includes("content_locked")) return "locked"; // item has a pending/approved deletion (0039)
  if (e.code === "PGRST204" || e.code === "42703") return "errDbOutdated"; // migration not applied yet
  if (e.code === "42501") return "forbidden";
  if (e.code === "23505") return "already";
  return "failed";
}
