import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registrationTypes = ["individual", "team"] as const;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: "8 أحرف على الأقل" }),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  // 8–15 digits, optional leading +, spaces/dashes allowed in input
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{8,15}$/)),
  registrationType: z.enum(registrationTypes),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
