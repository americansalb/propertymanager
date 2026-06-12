import { z } from "zod";

const dollarsToCents = (v: number) => Math.round(v * 100);

/** Real places only: 50 states, DC, and the territories USPS serves. */
export const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP",
] as const;

const stateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.enum(STATE_CODES, { message: "Use a real 2-letter state code" }));

export const unitInputSchema = z.object({
  unitNumber: z.string().min(1).max(24).trim(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  bathrooms: z.coerce.number().min(0).max(20).multipleOf(0.5).optional(),
  squareFeet: z.coerce.number().int().min(1).max(100_000).optional(),
  marketRentDollars: z.coerce.number().min(0).max(1_000_000).optional(),
});

export const propertyCreateSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  type: z.enum(["SINGLE_FAMILY", "MULTIFAMILY", "CONDO", "TOWNHOUSE", "COMMERCIAL", "OTHER"]),
  address1: z.string().min(1).max(160).trim(),
  address2: z.string().max(160).trim().optional().or(z.literal("")),
  city: z.string().min(1).max(80).trim(),
  state: stateSchema,
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  units: z.array(unitInputSchema).max(200).default([]),
  /** Same full address twice is usually a slip, but reality wins on demand. */
  allowDuplicate: z.boolean().optional(),
});

/** Full-line comparison: line 2 counts, so "Apt 1" and "Apt 2" differ. */
export function isSameAddress(
  a: { address1: string; address2?: string | null },
  b: { address1: string; address2?: string | null },
): boolean {
  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return norm(a.address1) === norm(b.address1) && norm(a.address2) === norm(b.address2);
}

export const propertyUpdateSchema = propertyCreateSchema.omit({ units: true }).partial();

/** Up to 12 short tags; trimmed, deduped case-insensitively, empties dropped. */
export function parseTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const tag = t.trim().slice(0, 24);
    if (!tag) continue;
    const k = tag.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(tag);
    if (out.length >= 12) break;
  }
  return out;
}

const clearableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** The operational record: progressive fields, all individually optional. */
export const propertyDetailsSchema = z.object({
  alternateAddress: clearableText(160),
  yearBuilt: z
    .union([
      z.literal("").transform(() => null),
      z.null(),
      z.coerce.number().int().min(1800).max(2030),
    ])
    .optional(),
  parkingNotes: clearableText(240),
  waterShutoffLocation: clearableText(240),
  breakerPanelLocation: clearableText(240),
  accessCodes: clearableText(240),
  petsAllowed: z
    .union([
      z.boolean(),
      z.null(),
      z.enum(["yes", "no", "unset"]).transform((v) => (v === "unset" ? null : v === "yes")),
    ])
    .optional(),
  petNotes: clearableText(240),
  notes: clearableText(2000),
  tags: z.array(z.string()).max(50).transform(parseTags).optional(),
});

export function toUnitData(input: z.infer<typeof unitInputSchema>) {
  return {
    unitNumber: input.unitNumber,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    squareFeet: input.squareFeet ?? null,
    marketRentCents:
      input.marketRentDollars !== undefined ? dollarsToCents(input.marketRentDollars) : null,
  };
}

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertyDetailsInput = z.infer<typeof propertyDetailsSchema>;
export type UnitInput = z.infer<typeof unitInputSchema>;
