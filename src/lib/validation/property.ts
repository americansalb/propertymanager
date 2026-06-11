import { z } from "zod";

const dollarsToCents = (v: number) => Math.round(v * 100);

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
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use the 2-letter state code"),
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  units: z.array(unitInputSchema).max(200).default([]),
});

export const propertyUpdateSchema = propertyCreateSchema.omit({ units: true }).partial();

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
export type UnitInput = z.infer<typeof unitInputSchema>;
