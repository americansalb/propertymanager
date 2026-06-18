/**
 * Charges core (pure): when rent is due, what is owed, and when a late fee
 * applies. Free of Prisma so it is unit-testable; the service
 * (services/charges.ts) and the worker tick read leases and write charges
 * through it. All dates are handled in UTC so a charge's period never shifts
 * by timezone.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** "YYYY-MM" for the month a date falls in (UTC). */
export function periodKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Rent due date for a year/month and due-day, clamped to the month's length. */
export function rentDueDate(year: number, monthIndex0: number, dueDay: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const day = Math.min(Math.max(Math.trunc(dueDay) || 1, 1), lastDay);
  return new Date(Date.UTC(year, monthIndex0, day));
}

export type LeaseForBilling = {
  status: string;
  startDate: Date;
  endDate: Date | null;
  monthlyRentCents: number;
  rentDueDay: number;
  lateFeeCents: number;
  lateFeeGraceDays: number;
};

export type ChargeSpec = {
  periodKey: string;
  dueDate: Date;
  amountCents: number;
  description: string;
};

/** The RENT charge that should exist for asOf's month, or null if the lease is not billable then. */
export function rentChargeForPeriod(lease: LeaseForBilling, asOf: Date): ChargeSpec | null {
  if (lease.status !== "ACTIVE") return null;
  if (lease.monthlyRentCents <= 0) return null;
  const year = asOf.getUTCFullYear();
  const month = asOf.getUTCMonth();
  const periodStart = new Date(Date.UTC(year, month, 1));
  const periodEnd = new Date(Date.UTC(year, month + 1, 0));
  // Skip months entirely before the lease starts or after it ends.
  if (periodEnd < startOfDayUTC(lease.startDate)) return null;
  if (lease.endDate && periodStart > startOfDayUTC(lease.endDate)) return null;
  return {
    periodKey: periodKeyOf(periodStart),
    dueDate: rentDueDate(year, month, lease.rentDueDay),
    amountCents: lease.monthlyRentCents,
    description: `Rent for ${MONTHS[month]} ${year}`,
  };
}

export type ChargeView = {
  type?: string;
  status: string;
  amountCents: number;
  amountPaidCents: number;
  dueDate: Date;
  periodKey?: string | null;
};

/** What remains owed on a charge (0 for VOID or fully paid). */
export function chargeOpenCents(
  c: Pick<ChargeView, "status" | "amountCents" | "amountPaidCents">,
): number {
  if (c.status === "VOID") return 0;
  return Math.max(0, c.amountCents - c.amountPaidCents);
}

/** Open and past its due date. */
export function isOverdue(c: ChargeView, asOf: Date): boolean {
  return chargeOpenCents(c) > 0 && startOfDayUTC(c.dueDate).getTime() < startOfDayUTC(asOf).getTime();
}

/** Whole days a charge is past due (0 when not past due). */
export function daysLate(dueDate: Date, asOf: Date): number {
  const diff = startOfDayUTC(asOf).getTime() - startOfDayUTC(dueDate).getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0;
}

export type BillingSummary = {
  balanceCents: number;
  pastDueCents: number;
  nextDueDate: Date | null;
  nextDueCents: number;
};

/** Roll a tenant's open charges into the numbers the portal shows. */
export function summarizeBilling(charges: ChargeView[], asOf: Date): BillingSummary {
  let balanceCents = 0;
  let pastDueCents = 0;
  const upcoming: ChargeView[] = [];
  for (const c of charges) {
    const open = chargeOpenCents(c);
    if (open <= 0) continue;
    balanceCents += open;
    if (isOverdue(c, asOf)) pastDueCents += open;
    else upcoming.push(c);
  }
  upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const next = upcoming[0] ?? null;
  const nextDueCents = next
    ? upcoming
        .filter((c) => c.dueDate.getTime() === next.dueDate.getTime())
        .reduce((s, c) => s + chargeOpenCents(c), 0)
    : 0;
  return {
    balanceCents,
    pastDueCents,
    nextDueDate: next ? next.dueDate : null,
    nextDueCents,
  };
}

/** The late fee a still-open overdue RENT charge should incur, or null. */
export function lateFeeForRent(
  rent: ChargeView,
  lease: Pick<LeaseForBilling, "lateFeeCents" | "lateFeeGraceDays">,
  asOf: Date,
): ChargeSpec | null {
  if (lease.lateFeeCents <= 0) return null;
  if (chargeOpenCents(rent) <= 0) return null;
  const graceEnd = addDaysUTC(startOfDayUTC(rent.dueDate), Math.max(0, lease.lateFeeGraceDays));
  if (startOfDayUTC(asOf).getTime() <= graceEnd.getTime()) return null;
  const periodKey = rent.periodKey ?? periodKeyOf(rent.dueDate);
  return {
    periodKey,
    dueDate: startOfDayUTC(asOf),
    amountCents: lease.lateFeeCents,
    description: `Late fee for ${periodKey}`,
  };
}
