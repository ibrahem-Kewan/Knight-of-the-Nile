"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { roleHome } from "@/config/roles";

export type ActionState = { error?: string } | undefined;

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "errLoginInvalid" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "errLoginFailed" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user!.id)
    .single();

  if (!profile || profile.status !== "active") redirect("/pending");
  redirect(roleHome[profile.role as keyof typeof roleHome] ?? "/");
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // One account per person: a signed-in user cannot register again from this session.
  {
    const {
      data: { user: current },
    } = await (await createClient()).auth.getUser();
    if (current) return { error: "errAlreadySignedIn" };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    registrationType: formData.get("registration_type"),
  });
  if (!parsed.success) {
    // No default type: the user must choose one explicitly.
    if (!formData.get("registration_type")) return { error: "errTypeRequired" };
    return { error: "errInvalidFields" };
  }
  const isTeam = parsed.data.registrationType === "team";

  // Team accounts must pick a real, active coach — validated before creating the account.
  let coachId: string | null = null;
  if (isTeam) {
    coachId = String(formData.get("coach_id") || "").trim() || null;
    if (!coachId) return { error: "errCoachRequired" };
    const { data: coach } = await (await createClient())
      .from("profiles")
      .select("id")
      .eq("id", coachId)
      .eq("role", "coach")
      .eq("status", "active")
      .maybeSingle();
    if (!coach) return { error: "errCoachRequired" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // The email already has an account (pending coach approval or not): no second registration.
    if (error.code === "user_already_exists" || error.code === "email_exists" || /already registered/i.test(error.message)) {
      return { error: "errEmailTaken" };
    }
    return { error: "errSignupFailed" };
  }
  // With email confirmation on, Supabase hides duplicates by returning a user with no identities.
  if (data.user && (data.user.identities?.length ?? 0) === 0) return { error: "errEmailTaken" };

  // Update the auto-created profile with name + optional chosen coach
  if (data.user) {
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        first_name_ar: parsed.data.firstName,
        last_name_ar: parsed.data.lastName,
        display_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
        phone: parsed.data.phone,
        registration_type: parsed.data.registrationType,
        primary_coach_id: coachId,
        // everyone registers as athlete; coach/judge via role request approved by admin
      })
      .eq("id", data.user.id);
    if (profErr) console.error("[register] profile update failed", profErr.code, profErr.message);

    // If a coach was chosen, create a pending link the coach must approve.
    if (coachId) {
      const { error: linkErr } = await supabase.from("coach_athletes").insert({
        coach_id: coachId,
        athlete_id: data.user.id,
        status: "pending",
        is_current: false,
      });
      if (linkErr) console.error("[register] coach link insert failed", linkErr.code, linkErr.message);
    }
  }

  // Athletes are active immediately; their dashboard unlocks after a coach approves them.
  redirect("/athlete");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
