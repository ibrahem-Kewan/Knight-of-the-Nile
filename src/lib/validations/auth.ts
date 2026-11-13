import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registrationTypes = ["individual", "team"] as const;

export const registerSchema = z.object({
  // Normalised so "A@x.com " and "a@x.com" are the same account.
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, { message: "errPasswordShort" }),
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

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: "errPasswordShort" }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "errPasswordMismatch", path: ["confirm"] });
