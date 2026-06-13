import { formatCents } from "@/lib/money";

/**
 * Lease logic (pure). Calendar dates (start/end) are stored as UTC midnight
 * and parsed/formatted pinned to UTC so the date never shifts with timezones.
 */

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatLeaseDate(date: Date): string {
  return DATE_FMT.format(date);
}

export function leaseTermLabel(startDate: Date, endDate: Date | null): string {
  if (!endDate) return `Month to month from ${formatLeaseDate(startDate)}`;
  return `${formatLeaseDate(startDate)} to ${formatLeaseDate(endDate)}`;
}

export function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n}st`;
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
  return `${n}th`;
}

export type LeaseSeedUnit = {
  marketRentCents: number | null;
  securityDepositCents: number | null;
  petDepositCents: number | null;
  petRentCents: number | null;
  parkingSpot: string | null;
  parkingRentCents: number | null;
  utilitiesIncluded: string[];
};

/**
 * A new lease is a snapshot of the unit's standing terms with a conventional
 * 12-month term starting the 1st of next month. Every value is a prefill,
 * not a decision: the landlord edits the rows in place.
 */
export function leaseDefaultsFromUnit(unit: LeaseSeedUnit, today = new Date()) {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  // Day 0 of the start month one year out = the day before the anniversary.
  const end = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), 0));
  return {
    startDate: start,
    endDate: end,
    monthlyRentCents: unit.marketRentCents ?? 0,
    securityDepositCents: unit.securityDepositCents ?? 0,
    rentDueDay: 1,
    petDepositCents: unit.petDepositCents,
    petRentCents: unit.petRentCents,
    parkingSpot: unit.parkingSpot,
    parkingRentCents: unit.parkingRentCents,
    utilitiesIncluded: [...unit.utilitiesIncluded],
  };
}

// ── Tenant-facing view ──────────────────────────────────────────────────────

export type TenantLeaseSource = {
  status: string;
  shareWithTenant: boolean;
  startDate: Date;
  endDate: Date | null;
  monthlyRentCents: number;
  securityDepositCents: number;
  rentDueDay: number;
  petDepositCents: number | null;
  petRentCents: number | null;
  parkingSpot: string | null;
  parkingRentCents: number | null;
  utilitiesIncluded: string[];
};

export type TenantLeaseTerms = {
  rentCents: number;
  rentDueLabel: string;
  termLabel: string;
  depositLabel: string | null;
  petLabel: string | null;
  parkingLabel: string | null;
  utilities: string[];
};

/**
 * What the tenant portal may show of a lease. Returns null when the landlord
 * keeps the lease hidden - the caller renders the quiet "not shared" state
 * and no money fields ever cross the wire.
 */
export function tenantLeaseTerms(lease: TenantLeaseSource): TenantLeaseTerms | null {
  if (!lease.shareWithTenant) return null;

  const petParts: string[] = [];
  if (lease.petRentCents != null) petParts.push(`${formatCents(lease.petRentCents)}/mo`);
  if (lease.petDepositCents != null) {
    petParts.push(`${formatCents(lease.petDepositCents)} deposit`);
  }

  let parkingLabel: string | null = null;
  if (lease.parkingRentCents === 0) {
    parkingLabel = lease.parkingSpot ? `${lease.parkingSpot} (included)` : "Included";
  } else if (lease.parkingRentCents != null) {
    parkingLabel = `${lease.parkingSpot ?? "Parking"} at ${formatCents(lease.parkingRentCents)}/mo`;
  } else if (lease.parkingSpot) {
    parkingLabel = lease.parkingSpot;
  }

  return {
    rentCents: lease.monthlyRentCents,
    rentDueLabel: `Due on the ${ordinal(lease.rentDueDay)}`,
    termLabel: leaseTermLabel(lease.startDate, lease.endDate),
    depositLabel:
      lease.securityDepositCents > 0 ? formatCents(lease.securityDepositCents) : null,
    petLabel: petParts.length > 0 ? petParts.join(", ") : null,
    parkingLabel,
    utilities: lease.utilitiesIncluded,
  };
}
