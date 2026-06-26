"use server";

import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().min(5),
});

export type ContactState = { ok?: boolean; error?: string } | undefined;

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: "تحقق من صحة الحقول" };

  // TODO: wire to email provider / contact_messages table later.
  console.log("[contact]", parsed.data);
  return { ok: true };
}
