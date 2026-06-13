import { z } from "zod";
import { passwordSchema } from "./auth";

export const inviteCreateSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
});

/**
 * Accept payload. Name and password are optional at the schema level because
 * an already-signed-in tenant accepts with one click; the service enforces
 * what each path actually needs.
 */
export const inviteAcceptSchema = z.object({
  token: z.string().min(20).max(200),
  firstName: z.string().min(1).max(64).trim().optional(),
  lastName: z.string().min(1).max(64).trim().optional(),
  password: passwordSchema.optional(),
});

export type InviteCreateInput = z.infer<typeof inviteCreateSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
