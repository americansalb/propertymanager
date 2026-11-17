import { z } from "zod";
import { TRADES } from "@/lib/quotes";
import { STATE_CODES } from "@/lib/validation/property";

/** "65", "$1,250.50" or 65 → cents. Empty or null → null. */
const centsOrNull = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    const s = String(v).replace(/[$,\s]/g, "");
    return s === "" ? null : Number(s);
  },
  z
    .number({ invalid_type_error: "Enter a dollar amount." })
    .finite("Enter a dollar amount.")
    .min(0, "Enter a dollar amount.")
    .max(100_000, "That amount is too large.")
    .transform((n) => Math.round(n * 100))
    .nullable(),
);

const textOrNull = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable(),
  );

export const proBasicsSchema = z.object({
  businessName: z.string().trim().min(1, "Enter your business name.").max(80).optional(),
  bio: textOrNull(600).optional(),
  hourlyRateDollars: centsOrNull.optional(),
  tripChargeDollars: centsOrNull.optional(),
  licenseNumber: textOrNull(40).optional(),
  licenseState: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim().toUpperCase() : v),
    z.enum(STATE_CODES, { message: "Use the two-letter state, like IL." }).nullable(),
  ).optional(),
  trades: z.array(z.enum(TRADES)).max(8, "Pick up to eight.").optional(),
  zips: z.string().max(600).optional(),
});

export type ProBasicsInput = z.infer<typeof proBasicsSchema>;

export const proPriceSchema = z.object({
  taskKey: z.string().min(1).max(40),
  fromDollars: centsOrNull,
});

export const publishSchema = z.object({ publish: z.boolean() });
