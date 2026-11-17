import { z } from "zod";
import { OPEN_TRADES } from "@/lib/projects";

const cents = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v),
  z.coerce.number({ invalid_type_error: "Enter your price." }).positive("Enter your price.").max(1_000_000).transform((n) => Math.round(n * 100)),
);
const centsOrNull = z.preprocess(
  (v) => (v === null || v === undefined || (typeof v === "string" && v.replace(/[$,\s]/g, "") === "") ? null : typeof v === "string" ? v.replace(/[$,\s]/g, "") : v),
  z.coerce.number().positive().max(1_000_000).transform((n) => Math.round(n * 100)).nullable(),
);
const textOrNull = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable());

export const newProjectSchema = z.object({
  repairId: z.string().min(1).optional(),
  propertyId: z.string().min(1).optional(),
  unitId: z.string().min(1).nullable().optional(),
  trade: z.enum(OPEN_TRADES).optional(),
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  bidDays: z.coerce.number().int().min(1).max(14).optional(),
});

export const acceptBidSchema = z.object({ bidId: z.string().min(1) });

export const bidSchema = z.object({
  priceDollars: cents,
  priceHighDollars: centsOrNull.optional(),
  availability: z.string().trim().min(2, "Say when you can come.").max(120),
  note: textOrNull(500).optional(),
});
