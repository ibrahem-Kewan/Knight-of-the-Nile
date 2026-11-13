"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: true; error?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS = ["instapay", "cash", "other"] as const;
// Message keys the SQL functions may raise (SQLSTATE 22023 / 42501) that the UI knows how to show.
const KNOWN_KEYS = new Set([
  "errOpenDeclaration",
  "errNotGroupMember",
  "errReasonRequired",
  "errRefRequired",
  "errGroupInactive",
  "errForbidden",
  "errInvalid",
]);

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

type Input = { method: (typeof METHODS)[number]; ref: string | null; note: string | null };
type Parsed = Input | { error: string } | null;

/** Validates method / reference / note. The amount and session count are never accepted from the client. */
function parseInput(fd: FormData): Parsed {
  const method = str(fd, "method");
  const ref = str(fd, "payment_ref");
  const note = str(fd, "note");
  if (!(METHODS as readonly string[]).includes(method)) return null;
  if (ref.length > 80 || note.length > 300) return null;
  if (method === "instapay" && ref.length < 3) return { error: "errRefRequired" };
  return { method: method as Input["method"], ref: ref || null, note: note || null };
}

function mapError(error: { code?: string; message?: string }): string {
  if (error.code === "42501") return error.message && KNOWN_KEYS.has(error.message) && error.message !== "errForbidden" ? error.message : "errForbidden";
  if (error.code === "22023") return error.message && KNOWN_KEYS.has(error.message) ? error.message : "errInvalid";
  if (error.code === "23514" || error.code === "23505") return "errInvalid";
  return "errGeneric";
}

function revalidateAll() {
  revalidatePath("/coach/groups/[id]", "page");
  revalidatePath("/coach");
  revalidatePath("/athlete/training");
}

/** Athlete declares a payment for a group they are an open member of. Coach confirms or rejects later. */
export async function declarePayment(groupId: string, fd: FormData): Promise<Res> {
  const me = await requireRole(["athlete"]);
  if (!UUID_RE.test(groupId)) return { error: "errInvalid" };
  const input = parseInput(fd);
  if (!input) return { error: "errInvalid" };
  if ("error" in input) return { error: input.error };

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("training_group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("athlete_id", me.id)
    .is("left_at", null)
    .maybeSingle();
  if (!member) return { error: "errNotGroupMember" };

  const { error } = await supabase.rpc("declare_payment", {
    p_group: groupId,
    p_method: input.method,
    p_ref: input.ref,
    p_note: input.note,
  });
  if (error) return { error: mapError(error) };
  revalidateAll();
  return { ok: true };
}

/** Pre-check: the cycle belongs to a group of this coach. Returns the group id or null. */
async function ownCycleGroup(cycleId: string, coachId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: cycle } = await supabase.from("subscription_cycles").select("group_id").eq("id", cycleId).maybeSingle();
  if (!cycle) return null;
  const { data: group } = await supabase
    .from("training_groups")
    .select("id")
    .eq("id", cycle.group_id as string)
    .eq("coach_id", coachId)
    .maybeSingle();
  return group ? (group.id as string) : null;
}

export async function confirmPayment(cycleId: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(cycleId)) return { error: "errInvalid" };
  if (!(await ownCycleGroup(cycleId, me.id))) return { error: "errForbidden" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_payment", { p_cycle: cycleId });
  if (error) return { error: mapError(error) };
  revalidateAll();
  return { ok: true };
}

export async function rejectPayment(cycleId: string, reason: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(cycleId)) return { error: "errInvalid" };
  const r = String(reason ?? "").trim();
  if (r.length < 3 || r.length > 300) return { error: "errReasonRequired" };
  if (!(await ownCycleGroup(cycleId, me.id))) return { error: "errForbidden" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_payment", { p_cycle: cycleId, p_reason: r });
  if (error) return { error: mapError(error) };
  revalidateAll();
  return { ok: true };
}

/** Coach records a payment directly (confirmed at once, in the coach's name). */
export async function recordPayment(groupId: string, athleteId: string, fd: FormData): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(groupId) || !UUID_RE.test(athleteId)) return { error: "errInvalid" };
  const input = parseInput(fd);
  if (!input) return { error: "errInvalid" };
  if ("error" in input) return { error: input.error };

  const supabase = await createClient();
  const { data: group } = await supabase
    .from("training_groups")
    .select("id")
    .eq("id", groupId)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!group) return { error: "errForbidden" };
  const { data: member } = await supabase
    .from("training_group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("athlete_id", athleteId)
    .limit(1)
    .maybeSingle(); // current or former member: a former member may still owe for sessions held
  if (!member) return { error: "errNotGroupMember" };

  const { error } = await supabase.rpc("record_payment", {
    p_group: groupId,
    p_athlete: athleteId,
    p_method: input.method,
    p_ref: input.ref,
    p_note: input.note,
  });
  if (error) return { error: mapError(error) };
  revalidateAll();
  return { ok: true };
}

export async function voidPayment(cycleId: string, reason: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(cycleId)) return { error: "errInvalid" };
  const r = String(reason ?? "").trim();
  if (r.length < 3 || r.length > 300) return { error: "errReasonRequired" };
  if (!(await ownCycleGroup(cycleId, me.id))) return { error: "errForbidden" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_payment", { p_cycle: cycleId, p_reason: r });
  if (error) return { error: mapError(error) };
  revalidateAll();
  return { ok: true };
}
