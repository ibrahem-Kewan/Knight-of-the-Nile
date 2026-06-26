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
  if (!parsed.success) return { error: "بيانات غير صحيحة" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "فشل تسجيل الدخول. تحقق من البريد وكلمة المرور." };

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
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "تحقق من صحة الحقول (كلمة المرور 8 أحرف على الأقل)." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "تعذّر إنشاء الحساب. قد يكون البريد مستخدمًا." };

  // Update the auto-created profile with name + chosen role
  if (data.user) {
    await supabase
      .from("profiles")
      .update({
        first_name_ar: parsed.data.firstName,
        last_name_ar: parsed.data.lastName,
        display_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
        role: parsed.data.role,
      })
      .eq("id", data.user.id);
  }

  redirect("/pending");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
