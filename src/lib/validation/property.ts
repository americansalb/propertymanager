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

/** Dollar inputs arrive as "1,850" or "$1850": strip decoration, then coerce. */
const dollarsField = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : v),
  z.coerce.number().min(0).max(1_000_000),
);

/** Suggested-but-not-enforced utilities; chips stay free text. */
export const UTILITY_SUGGESTIONS = ["Water", "Trash", "Heat", "Gas", "Electric", "Internet"];

export const unitInputSchema = z.object({
  unitNumber: z.string().min(1).max(24).trim(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  bathrooms: z.coerce.number().min(0).max(20).multipleOf(0.5).optional(),
  squareFeet: z.coerce.number().int().min(1).max(100_000).optional(),
  marketRentDollars: dollarsField.optional(),
  securityDepositDollars: dollarsField.optional(),
  petDepositDollars: dollarsField.optional(),
  petRentDollars: dollarsField.optional(),
  parkingRentDollars: dollarsField.optional(),
  parkingSpot: z.string().max(120).trim().optional(),
  utilitiesIncluded: z.array(z.string()).max(20).optional(),
});

/**
 * Partial unit update: only provided keys change; explicit null clears.
 * Status is settable directly until leases derive it (milestone 1.4);
 * after that, manual status remains the escape hatch for lease-less units.
 */
export const unitUpdateSchema = z.object({
  unitNumber: z.string().min(1).max(24).trim().optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).nullable().optional(),
  bathrooms: z.coerce.number().min(0).max(20).multipleOf(0.5).nullable().optional(),
  squareFeet: z.coerce.number().int().min(1).max(100_000).nullable().optional(),
  marketRentDollars: dollarsField.nullable().optional(),
  securityDepositDollars: dollarsField.nullable().optional(),
  petDepositDollars: dollarsField.nullable().optional(),
  petRentDollars: dollarsField.nullable().optional(),
  parkingRentDollars: dollarsField.nullable().optional(),
  parkingSpot: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  utilitiesIncluded: z.array(z.string()).max(20).optional(),
  status: z.enum(["VACANT", "OCCUPIED", "NOTICE"]).optional(),
});

const DOLLAR_TO_CENT_FIELDS = [
  ["marketRentDollars", "marketRentCents"],
  ["securityDepositDollars", "securityDepositCents"],
  ["petDepositDollars", "petDepositCents"],
  ["petRentDollars", "petRentCents"],
  ["parkingRentDollars", "parkingRentCents"],
] as const;

export function toUnitUpdateData(input: UnitUpdateInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.unitNumber !== undefined) data.unitNumber = input.unitNumber;
  if (input.bedrooms !== undefined) data.bedrooms = input.bedrooms;
  if (input.bathrooms !== undefined) data.bathrooms = input.bathrooms;
  if (input.squareFeet !== undefined) data.squareFeet = input.squareFeet;
  for (const [dollars, cents] of DOLLAR_TO_CENT_FIELDS) {
    const v = input[dollars];
    if (v !== undefined) data[cents] = v === null ? null : dollarsToCents(v);
  }
  if (input.parkingSpot !== undefined) data.parkingSpot = input.parkingSpot;
  if (input.utilitiesIncluded !== undefined) {
    data.utilitiesIncluded = parseUtilities(input.utilitiesIncluded);
  }
  if (input.status !== undefined) data.status = input.status;
  return data;
}

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

/** Chips normalizer: trimmed, deduped case-insensitively, empties dropped. */
export function parseChips(raw: string[], max = 12, maxLen = 24): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const chip = t.trim().slice(0, maxLen);
    if (!chip) continue;
    const k = chip.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(chip);
    if (out.length >= max) break;
  }
  return out;
}

/** Up to 12 short tags. */
export const parseTags = (raw: string[]): string[] => parseChips(raw);

/** Utilities included with the unit (free text, suggestions in the UI). */
export const parseUtilities = (raw: string[]): string[] => parseChips(raw, 10, 24);

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
  // Portrait studio: null resets to the seeded default.
  portraitSeed: z.coerce.number().int().min(0).max(2_147_483_647).nullable().optional(),
  portraitBody: z.enum(["BRICK", "BRICK_DEEP", "IRON"]).nullable().optional(),
  portraitRoof: z.enum(["PARAPET", "GABLE", "SHED"]).nullable().optional(),
  portraitAccent: z.enum(["COPPER", "PATINA"]).nullable().optional(),
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
  const cents = (v: number | undefined) => (v !== undefined ? dollarsToCents(v) : null);
  return {
    unitNumber: input.unitNumber,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    squareFeet: input.squareFeet ?? null,
    marketRentCents: cents(input.marketRentDollars),
    securityDepositCents: cents(input.securityDepositDollars),
    petDepositCents: cents(input.petDepositDollars),
    petRentCents: cents(input.petRentDollars),
    parkingRentCents: cents(input.parkingRentDollars),
    parkingSpot: input.parkingSpot?.trim() || null,
    utilitiesIncluded: parseUtilities(input.utilitiesIncluded ?? []),
  };
}

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertyDetailsInput = z.infer<typeof propertyDetailsSchema>;
export type UnitInput = z.infer<typeof unitInputSchema>;
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;
