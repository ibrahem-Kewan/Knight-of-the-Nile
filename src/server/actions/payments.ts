"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";

type Res = { ok?: boolean; error?: string };

/** Payer submits an InstaPay transfer reference; recorded as a pending payment. */
export async function submitInstapayPayment(input: {
  context: "course" | "tournament" | "event";
  refId: string;
  amount: number;
  externalRef: string;
}): Promise<Res> {
  const me = await requireAuth();
  if (!input.externalRef?.trim()) return { error: "no-ref" };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    payer_id: me.id,
    provider: "instapay",
    status: "pending",
    amount: input.amount || 0,
    context: input.context,
    ref_id: input.refId || null,
    external_ref: input.externalRef.trim(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Admin updates the InstaPay recipient shown at checkout. */
export async function updatePaymentSettings(formData: FormData): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const str = (k: string) => String(formData.get(k) || "").trim();
  const { error } = await supabase
    .from("payment_settings")
    .update({
      instapay_name: str("instapay_name"),
      instapay_handle: str("instapay_handle"),
      instapay_phone: str("instapay_phone"),
      instructions_ar: str("instructions_ar"),
      instructions_en: str("instructions_en"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** Admin confirms a manual payment. */
export async function markPaymentPaid(paymentId: string): Promise<Res> {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath("/admin/payments");
  return { ok: true };
}
