import { z } from "zod";
import { dollarsField, parseUtilities } from "./property";
import { LEASE_SHARE_FIELDS, parseDateOnly } from "@/lib/leases";

const dollarsToCents = (v: number) => Math.round(v * 100);

/** "YYYY-MM-DD" from a date input. The round-trip check catches impossible
 *  dates (Feb 31) that JS would silently roll into the next month. */
const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
  .refine((s) => {
    const d = parseDateOnly(s);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "That date doesn't exist");

/**
 * Partial lease update: only provided keys change; explicit null clears.
 * Rent due day stops at 28 so every month has the date. Status stays
 * settable as the escape hatch (accepting an invite is the normal path
 * to ACTIVE).
 */
export const leaseUpdateSchema = z.object({
  startDate: dateField.optional(),
  endDate: dateField.nullable().optional(), // null = month-to-month
  monthlyRentDollars: dollarsField.optional(),
  securityDepositDollars: dollarsField.nullable().optional(),
  rentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  lateFeeDollars: dollarsField.nullable().optional(),
  lateFeeGraceDays: z.coerce.number().int().min(0).max(30).optional(),
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
  shareWithTenant: z.boolean().optional(),
  sharedFields: z.array(z.enum(LEASE_SHARE_FIELDS)).max(LEASE_SHARE_FIELDS.length).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "TERMINATED"]).optional(),
});

export type LeaseUpdateInput = z.infer<typeof leaseUpdateSchema>;

export function toLeaseUpdateData(input: LeaseUpdateInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.startDate !== undefined) data.startDate = parseDateOnly(input.startDate);
  if (input.endDate !== undefined) {
    data.endDate = input.endDate === null ? null : parseDateOnly(input.endDate);
  }
  if (input.monthlyRentDollars !== undefined) {
    data.monthlyRentCents = dollarsToCents(input.monthlyRentDollars);
  }
  // NOT NULL columns with defaults: clearing means back to zero.
  if (input.securityDepositDollars !== undefined) {
    data.securityDepositCents =
      input.securityDepositDollars === null ? 0 : dollarsToCents(input.securityDepositDollars);
  }
  if (input.lateFeeDollars !== undefined) {
    data.lateFeeCents = input.lateFeeDollars === null ? 0 : dollarsToCents(input.lateFeeDollars);
  }
  // Nullable columns: clearing means "no such term".
  if (input.petDepositDollars !== undefined) {
    data.petDepositCents =
      input.petDepositDollars === null ? null : dollarsToCents(input.petDepositDollars);
  }
  if (input.petRentDollars !== undefined) {
    data.petRentCents = input.petRentDollars === null ? null : dollarsToCents(input.petRentDollars);
  }
  if (input.parkingRentDollars !== undefined) {
    data.parkingRentCents =
      input.parkingRentDollars === null ? null : dollarsToCents(input.parkingRentDollars);
  }
  if (input.parkingSpot !== undefined) data.parkingSpot = input.parkingSpot;
  if (input.utilitiesIncluded !== undefined) {
    data.utilitiesIncluded = parseUtilities(input.utilitiesIncluded);
  }
  if (input.rentDueDay !== undefined) data.rentDueDay = input.rentDueDay;
  if (input.lateFeeGraceDays !== undefined) data.lateFeeGraceDays = input.lateFeeGraceDays;
  if (input.shareWithTenant !== undefined) data.shareWithTenant = input.shareWithTenant;
  if (input.sharedFields !== undefined) {
    // Dedupe into canonical order so the stored array is always tidy.
    data.sharedFields = LEASE_SHARE_FIELDS.filter((f) => input.sharedFields!.includes(f));
  }
  if (input.status !== undefined) data.status = input.status;
  return data;
}
