import { describe, expect, it } from "vitest";
import {
  isoDateOnly,
  leaseDefaultsFromUnit,
  leaseTermLabel,
  ordinal,
  parseDateOnly,
  tenantLeaseTerms,
  type TenantLeaseSource,
} from "@/lib/leases";

const unit = {
  marketRentCents: 192_500,
  securityDepositCents: 190_000,
  petDepositCents: 30_000,
  petRentCents: 5_000,
  parkingSpot: "1 assigned spot, garage",
  parkingRentCents: 0,
  utilitiesIncluded: ["Water", "Trash"],
};

describe("leaseDefaultsFromUnit", () => {
  it("snapshots the standing terms with a 12-month term from the 1st of next month", () => {
    const d = leaseDefaultsFromUnit(unit, new Date("2026-06-13T12:00:00Z"));
    expect(isoDateOnly(d.startDate)).toBe("2026-07-01");
    expect(isoDateOnly(d.endDate)).toBe("2027-06-30");
    expect(d).toMatchObject({
      monthlyRentCents: 192_500,
      securityDepositCents: 190_000,
      rentDueDay: 1,
      petDepositCents: 30_000,
      petRentCents: 5_000,
      parkingSpot: "1 assigned spot, garage",
      parkingRentCents: 0,
      utilitiesIncluded: ["Water", "Trash"],
    });
  });

  it("rolls over the year in December and zero-fills unset money", () => {
    const d = leaseDefaultsFromUnit(
      { ...unit, marketRentCents: null, securityDepositCents: null },
      new Date("2026-12-05T00:00:00Z"),
    );
    expect(isoDateOnly(d.startDate)).toBe("2027-01-01");
    expect(isoDateOnly(d.endDate)).toBe("2027-12-31");
    expect(d.monthlyRentCents).toBe(0);
    expect(d.securityDepositCents).toBe(0);
  });
});

describe("date plumbing", () => {
  it("round-trips a calendar date through UTC midnight", () => {
    expect(isoDateOnly(parseDateOnly("2026-02-28"))).toBe("2026-02-28");
  });

  it("labels terms, including month-to-month", () => {
    expect(leaseTermLabel(parseDateOnly("2026-01-01"), parseDateOnly("2026-12-31"))).toBe(
      "Jan 1, 2026 to Dec 31, 2026",
    );
    expect(leaseTermLabel(parseDateOnly("2026-03-15"), null)).toBe(
      "Month to month from Mar 15, 2026",
    );
  });

  it("ordinals: 1st, 2nd, 3rd, 4th, 11th, 21st", () => {
    expect([1, 2, 3, 4, 11, 21].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "21st",
    ]);
  });
});

const lease: TenantLeaseSource = {
  status: "ACTIVE",
  shareWithTenant: true,
  startDate: parseDateOnly("2026-01-01"),
  endDate: parseDateOnly("2026-12-31"),
  monthlyRentCents: 185_000,
  securityDepositCents: 185_000,
  rentDueDay: 1,
  petDepositCents: 30_000,
  petRentCents: 5_000,
  parkingSpot: "Spot 4",
  parkingRentCents: 0,
  utilitiesIncluded: ["Water", "Trash"],
};

describe("tenantLeaseTerms", () => {
  it("returns nothing at all when the landlord keeps the lease hidden", () => {
    expect(tenantLeaseTerms({ ...lease, shareWithTenant: false })).toBeNull();
  });

  it("builds the shared view", () => {
    const t = tenantLeaseTerms(lease)!;
    expect(t.rentCents).toBe(185_000);
    expect(t.rentDueLabel).toBe("Due on the 1st");
    expect(t.termLabel).toBe("Jan 1, 2026 to Dec 31, 2026");
    expect(t.depositLabel).toBe("$1,850.00");
    expect(t.petLabel).toBe("$50.00/mo, $300.00 deposit");
    expect(t.parkingLabel).toBe("Spot 4 (included)");
    expect(t.utilities).toEqual(["Water", "Trash"]);
  });

  it("prices parking when it rents separately and hides zero deposits", () => {
    const t = tenantLeaseTerms({
      ...lease,
      securityDepositCents: 0,
      petDepositCents: null,
      petRentCents: null,
      parkingRentCents: 15_000,
    })!;
    expect(t.depositLabel).toBeNull();
    expect(t.petLabel).toBeNull();
    expect(t.parkingLabel).toBe("Spot 4 at $150.00/mo");
  });
});
