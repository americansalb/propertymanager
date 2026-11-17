import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const signupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  firstName: z.string().min(1).max(64).trim(),
  lastName: z.string().min(1).max(64).trim(),
  accountType: z.enum(["LANDLORD", "PRO"]),
  // Landlord: organization name. Pro: business name.
  businessName: z.string().min(1).max(120).trim(),
  // Collected for pros at signup; full onboarding completes the profile (Phase 2).
  phone: z.string().min(7).max(20).trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotSchema = z.object({
  // Trim before checking, so a stray space from a phone keyboard is not an error.
  email: z.string().trim().toLowerCase().email("That does not look like an email address."),
});

export const resetSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});
