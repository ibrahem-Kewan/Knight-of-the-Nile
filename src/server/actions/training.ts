"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

type Res = { ok?: true; error?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\/\S+$/i;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

type BranchInput = {
  name_ar: string;
  name_en: string | null;
  governorate_id: string | null;
  address: string | null;
  map_url: string | null;
};

function parseBranch(fd: FormData): BranchInput | null {
  const name_ar = str(fd, "name_ar");
  const name_en = str(fd, "name_en");
  const address = str(fd, "address");
  const map_url = str(fd, "map_url");
  const governorate_id = str(fd, "governorate_id");

  if (name_ar.length < 2 || name_ar.length > 80) return null;
  if (name_en.length > 80) return null;
  if (address.length > 200) return null;
  if (map_url && (map_url.length > 500 || !URL_RE.test(map_url))) return null;
  if (governorate_id && !UUID_RE.test(governorate_id)) return null;

  return {
    name_ar,
    name_en: name_en || null,
    governorate_id: governorate_id || null,
    address: address || null,
    map_url: map_url || null,
  };
}

// ---- coach branches ----
export async function createBranch(fd: FormData): Promise<Res> {
  const me = await requireRole(["coach"]);
  const input = parseBranch(fd);
  if (!input) return { error: "errInvalid" };

  const supabase = await createClient();
  const { error } = await supabase.from("coach_branches").insert({ ...input, coach_id: me.id });
  if (error) return { error: error.code === "42501" ? "errForbidden" : "errGeneric" };

  revalidatePath("/coach/branches");
  return { ok: true };
}

export async function updateBranch(id: string, fd: FormData): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(id)) return { error: "errInvalid" };
  const input = parseBranch(fd);
  if (!input) return { error: "errInvalid" };

  const supabase = await createClient();
  const { data: own } = await supabase
    .from("coach_branches")
    .select("id")
    .eq("id", id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!own) return { error: "errNotFound" };

  const { error } = await supabase.from("coach_branches").update(input).eq("id", id).eq("coach_id", me.id);
  if (error) return { error: error.code === "42501" ? "errForbidden" : "errGeneric" };

  revalidatePath("/coach/branches");
  return { ok: true };
}

export async function setBranchActive(id: string, active: boolean): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(id)) return { error: "errInvalid" };

  const supabase = await createClient();
  const { data: own } = await supabase
    .from("coach_branches")
    .select("id")
    .eq("id", id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!own) return { error: "errNotFound" };

  const { error } = await supabase
    .from("coach_branches")
    .update({ is_active: active })
    .eq("id", id)
    .eq("coach_id", me.id);
  if (error) return { error: error.code === "42501" ? "errForbidden" : "errGeneric" };

  revalidatePath("/coach/branches");
  return { ok: true };
}

// ---- training groups ----
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FEE_RE = /^\d{1,8}(\.\d{1,2})?$/;

type GroupInput = {
  branch_id: string;
  sport_id: string | null;
  name_ar: string;
  name_en: string | null;
  weekdays: number[];
  start_time: string;
  duration_minutes: number;
  sessions_per_cycle: number;
  monthly_fee: number;
  starts_on: string;
};

function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function parseGroup(fd: FormData): { input?: GroupInput; error?: string } {
  const name_ar = str(fd, "name_ar");
  const name_en = str(fd, "name_en");
  const branch_id = str(fd, "branch_id");
  const sport_id = str(fd, "sport_id");
  const start_time = str(fd, "start_time").slice(0, 5);
  const starts_on = str(fd, "starts_on");
  const feeRaw = str(fd, "monthly_fee").replace(",", ".");
  const durRaw = str(fd, "duration_minutes");
  const sessRaw = str(fd, "sessions_per_cycle");

  if (name_ar.length < 2 || name_ar.length > 80 || name_en.length > 80) return { error: "errInvalid" };
  if (!UUID_RE.test(branch_id)) return { error: "errBranch" };
  if (sport_id && !UUID_RE.test(sport_id)) return { error: "errInvalid" };

  const rawDays = fd.getAll("weekdays").map((v) => String(v));
  const weekdays = rawDays.map(Number);
  if (
    weekdays.length < 1 ||
    weekdays.some((n, i) => !/^[0-6]$/.test(rawDays[i]) || !Number.isInteger(n)) ||
    new Set(weekdays).size !== weekdays.length
  ) {
    return { error: "errWeekdays" };
  }
  weekdays.sort((a, b) => a - b);

  if (!TIME_RE.test(start_time)) return { error: "errTime" };

  if (!/^\d+$/.test(durRaw)) return { error: "errDuration" };
  const duration_minutes = Number(durRaw);
  if (duration_minutes < 15 || duration_minutes > 480) return { error: "errDuration" };

  if (!/^\d+$/.test(sessRaw)) return { error: "errSessions" };
  const sessions_per_cycle = Number(sessRaw);
  if (sessions_per_cycle < 1 || sessions_per_cycle > 31) return { error: "errSessions" };

  if (!FEE_RE.test(feeRaw)) return { error: "errFee" };
  const monthly_fee = Number(feeRaw);

  if (!isRealDate(starts_on)) return { error: "errInvalid" };

  return {
    input: {
      branch_id,
      sport_id: sport_id || null,
      name_ar,
      name_en: name_en || null,
      weekdays,
      start_time,
      duration_minutes,
      sessions_per_cycle,
      monthly_fee,
      starts_on,
    },
  };
}

const dbError = (code?: string, message?: string): string => {
  if (message && message.includes("errBranch")) return "errBranch";
  if (code === "22023") return "errBranch";
  return code === "42501" ? "errForbidden" : code === "23514" ? "errInvalid" : "errGeneric";
};

export async function createGroup(fd: FormData): Promise<Res> {
  const me = await requireRole(["coach"]);
  const { input, error } = parseGroup(fd);
  if (!input) return { error };

  const supabase = await createClient();
  const { data: branch } = await supabase
    .from("coach_branches")
    .select("id")
    .eq("id", input.branch_id)
    .eq("coach_id", me.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!branch) return { error: "errBranch" };

  const { error: dbErr } = await supabase.from("training_groups").insert({ ...input, coach_id: me.id });
  if (dbErr) return { error: dbError(dbErr.code, dbErr.message) };

  revalidatePath("/coach/groups");
  return { ok: true };
}

export async function updateGroup(id: string, fd: FormData): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(id)) return { error: "errInvalid" };
  const { input, error } = parseGroup(fd);
  if (!input) return { error };

  const supabase = await createClient();
  const { data: own } = await supabase
    .from("training_groups")
    .select("id, branch_id")
    .eq("id", id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!own) return { error: "errGroupNotFound" };

  // The branch must be mine and active, unless the group already sits in it (keep an inactive current branch).
  const { data: branch } = await supabase
    .from("coach_branches")
    .select("id, is_active")
    .eq("id", input.branch_id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!branch || (!branch.is_active && branch.id !== own.branch_id)) return { error: "errBranch" };

  const { error: dbErr } = await supabase
    .from("training_groups")
    .update(input)
    .eq("id", id)
    .eq("coach_id", me.id);
  if (dbErr) return { error: dbError(dbErr.code, dbErr.message) };

  // Sync generated sessions with the (possibly changed) schedule. Best effort: the page also re-runs it on render.
  await supabase.rpc("ensure_group_sessions", { p_group: id });

  revalidatePath("/coach/groups");
  revalidatePath(`/coach/groups/${id}`);
  return { ok: true };
}

export async function setGroupActive(id: string, active: boolean): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(id)) return { error: "errInvalid" };

  const supabase = await createClient();
  const { data: own } = await supabase
    .from("training_groups")
    .select("id")
    .eq("id", id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!own) return { error: "errGroupNotFound" };

  const { error } = await supabase
    .from("training_groups")
    .update({ is_active: active })
    .eq("id", id)
    .eq("coach_id", me.id);
  if (error) return { error: dbError(error.code, error.message) };

  revalidatePath("/coach/groups");
  revalidatePath(`/coach/groups/${id}`);
  return { ok: true };
}

// ---- group members ----
const memberDbError = (code?: string, message?: string): string => {
  if (code === "23505") return "errAlreadyMember";
  if (message?.includes("errNotYourAthlete")) return "errNotYourAthlete";
  if (message?.includes("errGroupInactive")) return "errGroupInactive";
  return code === "42501" ? "errForbidden" : code === "22023" || code === "23514" ? "errInvalid" : "errGeneric";
};

export async function addToGroup(groupId: string, athleteId: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(groupId) || !UUID_RE.test(athleteId)) return { error: "errInvalid" };

  const supabase = await createClient();
  const { data: group } = await supabase
    .from("training_groups")
    .select("id, is_active")
    .eq("id", groupId)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!group) return { error: "errGroupNotFound" };
  if (!group.is_active) return { error: "errGroupInactive" };

  const { data: link } = await supabase
    .from("coach_athletes")
    .select("id")
    .eq("coach_id", me.id)
    .eq("athlete_id", athleteId)
    .eq("is_current", true)
    .eq("status", "active")
    .limit(1);
  if (!link?.length) return { error: "errNotYourAthlete" };

  const { data: open } = await supabase
    .from("training_group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("athlete_id", athleteId)
    .is("left_at", null)
    .maybeSingle();
  if (open) return { error: "errAlreadyMember" };

  const { error } = await supabase
    .from("training_group_members")
    .insert({ group_id: groupId, athlete_id: athleteId, added_by: me.id });
  if (error) return { error: memberDbError(error.code, error.message) };

  revalidatePath("/coach/athletes");
  revalidatePath(`/coach/groups/${groupId}`);
  return { ok: true };
}

export async function removeFromGroup(membershipId: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(membershipId)) return { error: "errInvalid" };

  const supabase = await createClient();
  const { data: m } = await supabase
    .from("training_group_members")
    .select("id, group_id, left_at")
    .eq("id", membershipId)
    .maybeSingle();
  if (!m) return { error: "errNotFound" };

  const { data: group } = await supabase
    .from("training_groups")
    .select("id")
    .eq("id", m.group_id)
    .eq("coach_id", me.id)
    .maybeSingle();
  if (!group) return { error: "errForbidden" };
  if (m.left_at) return { error: "errNotFound" };

  // The DB sets left_at to now() itself; the value sent here is overwritten by the guard trigger.
  const { data: updated, error } = await supabase
    .from("training_group_members")
    .update({ left_at: new Date().toISOString(), removed_by: me.id })
    .eq("id", membershipId)
    .is("left_at", null)
    .select("id");
  if (error) return { error: memberDbError(error.code, error.message) };
  if (!updated?.length) return { error: "errNotFound" };

  revalidatePath("/coach/athletes");
  revalidatePath(`/coach/groups/${m.group_id}`);
  return { ok: true };
}

// ---- training sessions ----
const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CANCEL_KINDS = ["holiday", "coach_absent", "other"] as const;

const sessionDbError = (code?: string, message?: string): string => {
  if (message?.includes("errHasAttendance")) return "errHasAttendance";
  if (message?.includes("errReason")) return "errReason";
  if (message?.includes("errTooLate")) return "errTooLate";
  if (message?.includes("errKindPast")) return "errKindPast";
  return code === "42501" ? "errForbidden" : code === "22023" || code === "23514" ? "errInvalid" : "errGeneric";
};

/** Loads a session of one of my groups (ownership check); null when missing or not mine. */
async function mySession(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string, coachId: string) {
  const { data: session } = await supabase
    .from("training_sessions")
    .select("id, group_id, status, scheduled_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;
  const { data: group } = await supabase
    .from("training_groups")
    .select("id")
    .eq("id", session.group_id)
    .eq("coach_id", coachId)
    .maybeSingle();
  return group ? (session as { id: string; group_id: string; status: string; scheduled_at: string }) : null;
}

export async function cancelSession(sessionId: string, kind: string, reasonRaw: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(sessionId)) return { error: "errInvalid" };
  if (!(CANCEL_KINDS as readonly string[]).includes(kind)) return { error: "errInvalid" };
  const reason = String(reasonRaw ?? "").trim();
  if (reason.length < 3 || reason.length > 200) return { error: "errReason" };

  const supabase = await createClient();
  const session = await mySession(supabase, sessionId, me.id);
  if (!session) return { error: "errNotFound" };
  if (session.status !== "scheduled") return { error: "errInvalid" };
  // Past sessions: coach edit window of 7 days (the DB enforces the same), and no advance-only "holiday" kind.
  const at = new Date(session.scheduled_at).getTime();
  if (Date.now() > at + EDIT_WINDOW_MS) return { error: "errTooLate" };
  if (at <= Date.now() && kind === "holiday") return { error: "errKindPast" };

  // Refuse when a present attendance row exists (RLS lets the group's coach read it; the DB guard also enforces this).
  const { data: present, error: attErr } = await supabase
    .from("session_attendance")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "present")
    .limit(1);
  if (attErr) return { error: "errGeneric" };
  if (present?.length) return { error: "errHasAttendance" };

  // cancelled_by / cancelled_at are set by a DB trigger, never trusted from here.
  const { data: updated, error } = await supabase
    .from("training_sessions")
    .update({ status: "cancelled", cancel_kind: kind, cancel_reason: reason })
    .eq("id", sessionId)
    .eq("status", "scheduled")
    .select("id");
  if (error) return { error: sessionDbError(error.code, error.message) };
  if (!updated?.length) return { error: "errNotFound" };

  revalidatePath(`/coach/groups/${session.group_id}`);
  return { ok: true };
}

export async function restoreSession(sessionId: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(sessionId)) return { error: "errInvalid" };

  const supabase = await createClient();
  const session = await mySession(supabase, sessionId, me.id);
  if (!session) return { error: "errNotFound" };
  if (session.status !== "cancelled") return { error: "errInvalid" };
  if (Date.now() > new Date(session.scheduled_at).getTime() + EDIT_WINDOW_MS) return { error: "errTooLate" };

  const { data: updated, error } = await supabase
    .from("training_sessions")
    .update({ status: "scheduled" })
    .eq("id", sessionId)
    .eq("status", "cancelled")
    .select("id");
  if (error) return { error: sessionDbError(error.code, error.message) };
  if (!updated?.length) return { error: "errNotFound" };

  revalidatePath(`/coach/groups/${session.group_id}`);
  return { ok: true };
}

// ---- attendance ----
const ATTENDANCE_OPEN_AHEAD_MS = 60 * 60 * 1000;

export type AttendanceInput = {
  athleteId: string;
  status: string;
  score: number | null;
  performance: number | null;
  note: string;
};

const attendanceDbError = (code?: string, message?: string): string => {
  if (message?.includes("attendance_not_allowed")) return "errAttendance";
  if (message?.includes("errTooLate")) return "errTooLate";
  if (code === "23514") {
    if (message?.includes("score")) return "errScore";
    if (message?.includes("performance")) return "errPerformance";
    return "errInvalid";
  }
  return code === "42501" ? "errForbidden" : code === "22023" ? "errInvalid" : "errGeneric";
};

/** All-or-nothing: every row is validated first, then all rows are upserted in ONE statement. */
export async function saveAttendance(sessionId: string, rows: AttendanceInput[]): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(sessionId) || !Array.isArray(rows) || !rows.length || rows.length > 500) return { error: "errInvalid" };

  const supabase = await createClient();
  const session = await mySession(supabase, sessionId, me.id);
  if (!session) return { error: "errNotFound" };
  if (session.status !== "scheduled") return { error: "errAttendance" };
  const at = new Date(session.scheduled_at).getTime();
  if (at > Date.now() + ATTENDANCE_OPEN_AHEAD_MS) return { error: "errAttendance" };
  if (Date.now() > at + EDIT_WINDOW_MS) return { error: "errTooLate" };

  const { data: memberRows, error: memErr } = await supabase
    .from("training_group_members")
    .select("athlete_id")
    .eq("group_id", session.group_id)
    .lte("joined_at", session.scheduled_at)
    .or(`left_at.is.null,left_at.gt.${session.scheduled_at}`);
  if (memErr) return { error: "errGeneric" };
  const eligible = new Set((memberRows ?? []).map((m) => m.athlete_id as string));

  const seen = new Set<string>();
  const payload: Record<string, unknown>[] = [];
  for (const r of rows) {
    if (!r || typeof r.athleteId !== "string" || !UUID_RE.test(r.athleteId)) return { error: "errInvalid" };
    if (!eligible.has(r.athleteId)) return { error: "errNotMember" };
    if (seen.has(r.athleteId)) return { error: "errInvalid" };
    seen.add(r.athleteId);
    if (r.status !== "present" && r.status !== "absent") return { error: "errInvalid" };
    let score: number | null = null;
    if (r.score !== null && r.score !== undefined) {
      if (typeof r.score !== "number" || !Number.isFinite(r.score) || r.score < 0 || r.score > 999999.99) return { error: "errScore" };
      score = Math.round(r.score * 100) / 100;
    }
    let performance: number | null = null;
    if (r.performance !== null && r.performance !== undefined) {
      if (!Number.isInteger(r.performance) || r.performance < 1 || r.performance > 5) return { error: "errPerformance" };
      performance = r.performance;
    }
    const note = String(r.note ?? "").trim();
    if (note.length > 300) return { error: "errInvalid" };
    // recorded_by / recorded_at / updated_by / updated_at are stamped by the DB trigger, never sent from here.
    payload.push({
      session_id: sessionId,
      athlete_id: r.athleteId,
      status: r.status,
      score,
      performance,
      note: note || null,
    });
  }

  const { error } = await supabase.from("session_attendance").upsert(payload, { onConflict: "session_id,athlete_id" });
  if (error) return { error: attendanceDbError(error.code, error.message) };

  revalidatePath(`/coach/groups/${session.group_id}/sessions/${sessionId}`);
  revalidatePath(`/coach/groups/${session.group_id}`);
  return { ok: true };
}

// ---- attendance claims (athlete alerts the coach) ----
const claimDbError = (code?: string, message?: string): string => {
  if (code === "23505") return "errClaimExists";
  if (message?.includes("claim_not_allowed") || message?.includes("attendance_not_allowed")) return "errClaimNotAllowed";
  if (message?.includes("errTooLate")) return "errTooLate";
  if (message?.includes("errReasonRequired")) return "errReasonRequired";
  if (message?.includes("errNotFound")) return "errNotFound";
  if (message?.includes("errInvalid")) return "errInvalid";
  return code === "42501" ? "errForbidden" : code === "22023" ? "errInvalid" : "errGeneric";
};

export async function createAttendanceClaim(sessionId: string, messageRaw: string): Promise<Res> {
  const me = await requireRole(["athlete"]);
  if (!UUID_RE.test(sessionId)) return { error: "errInvalid" };
  const message = String(messageRaw ?? "").trim();
  if (message.length > 300) return { error: "errInvalid" };

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("training_sessions")
    .select("id, group_id, status, scheduled_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { error: "errClaimNotAllowed" };
  const at = new Date(session.scheduled_at as string).getTime();
  if (session.status !== "scheduled" || at > Date.now() || Date.now() > at + EDIT_WINDOW_MS) {
    return { error: "errClaimNotAllowed" };
  }

  const { data: member } = await supabase
    .from("training_group_members")
    .select("id")
    .eq("group_id", session.group_id)
    .eq("athlete_id", me.id)
    .lte("joined_at", session.scheduled_at)
    .or(`left_at.is.null,left_at.gt.${session.scheduled_at}`)
    .limit(1);
  if (!member?.length) return { error: "errClaimNotAllowed" };

  const [{ data: att }, { data: prior }] = await Promise.all([
    supabase.from("session_attendance").select("status").eq("session_id", sessionId).eq("athlete_id", me.id).maybeSingle(),
    supabase.from("attendance_claims").select("status").eq("session_id", sessionId).eq("athlete_id", me.id),
  ]);
  if (att?.status === "present") return { error: "errClaimNotAllowed" };
  if (prior?.some((c) => c.status === "open")) return { error: "errClaimExists" };
  // At most one rejected claim per session: no re-claim after a rejection.
  if (prior?.some((c) => c.status === "rejected")) return { error: "errClaimNotAllowed" };

  // status / created_at / resolved_* are forced by the DB trigger and the RLS check.
  const { error } = await supabase
    .from("attendance_claims")
    .insert({ session_id: sessionId, athlete_id: me.id, message: message || null });
  if (error) return { error: claimDbError(error.code, error.message) };

  revalidatePath("/athlete/training");
  revalidatePath(`/coach/groups/${session.group_id}`);
  revalidatePath("/coach");
  return { ok: true };
}

export async function resolveAttendanceClaim(claimId: string, accept: boolean, noteRaw: string): Promise<Res> {
  const me = await requireRole(["coach"]);
  if (!UUID_RE.test(claimId) || typeof accept !== "boolean") return { error: "errInvalid" };
  const note = String(noteRaw ?? "").trim();
  if (note.length > 300) return { error: "errReasonRequired" };
  if (!accept && note.length < 3) return { error: "errReasonRequired" };

  const supabase = await createClient();
  const { data: claim } = await supabase
    .from("attendance_claims")
    .select("id, session_id, status, created_at")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim) return { error: "errNotFound" };
  const session = await mySession(supabase, claim.session_id as string, me.id);
  if (!session) return { error: "errForbidden" };
  if (claim.status !== "open") return { error: "errInvalid" };
  // Coach deadline to accept: 7 days after the claim was sent (the DB enforces the same; admins are exempt there).
  if (accept && Date.now() > new Date(claim.created_at as string).getTime() + EDIT_WINDOW_MS) return { error: "errTooLate" };

  const { error } = await supabase.rpc("resolve_attendance_claim", {
    p_claim: claimId,
    p_accept: accept,
    p_note: note || null,
  });
  if (error) return { error: claimDbError(error.code, error.message) };

  revalidatePath("/athlete/training");
  revalidatePath(`/coach/groups/${session.group_id}`);
  revalidatePath(`/coach/groups/${session.group_id}/sessions/${session.id}`);
  revalidatePath("/coach");
  return { ok: true };
}
