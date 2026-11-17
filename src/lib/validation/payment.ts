import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/payments";

const methodKeys = Object.keys(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS, ...Array<keyof typeof PAYMENT_METHODS>];

export const recordPaymentSchema = z.object({
  amountDollars: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v),
    z.coerce
      .number({ invalid_type_error: "Enter the amount." })
      .positive("Enter the amount.")
      .max(1_000_000, "That amount is too large."),
  ),
  method: z.enum(methodKeys, { message: "Pick how it was paid." }),
  /** The day the money arrived, as YYYY-MM-DD. */
  receivedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the day it arrived.")
    .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Pick the day it arrived."),
  note: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(200).optional(),
  ),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
