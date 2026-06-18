import { describe, expect, it } from "vitest";
import {
  periodKeyOf,
  rentDueDate,
  rentChargeForPeriod,
  chargeOpenCents,
  isOverdue,
  daysLate,
  summarizeBilling,
  lateFeeForRent,
  type LeaseForBilling,
  type ChargeView,
} from "@/lib/charges";

const lease: LeaseForBilling = {
  status: "ACTIVE",
  startDate: new Date("2026-01-01T00:00:00Z"),
  endDate: new Date("2026-12-31T00:00:00Z"),
  monthlyRentCents: 185_000,
  rentDueDay: 1,
  lateFeeCents: 7_500,
  lateFeeGraceDays: 5,
};

describe("periodKeyOf", () => {
  it("formats the UTC month as YYYY-MM", () => {
    expect(periodKeyOf(new Date("2026-07-15T00:00:00Z"))).toBe("2026-07");
    expect(periodKeyOf(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });
});

describe("rentDueDate", () => {
  it("uses the due day when it fits the month", () => {
    expect(rentDueDate(2026, 6, 5)).toEqual(new Date(Date.UTC(2026, 6, 5)));
  });
  it("clamps a day past the month's end (Feb 31 to Feb 28)", () => {
    expect(rentDueDate(2026, 1, 31)).toEqual(new Date(Date.UTC(2026, 1, 28)));
  });
  it("respects a leap February", () => {
    expect(rentDueDate(2028, 1, 31)).toEqual(new Date(Date.UTC(2028, 1, 29)));
  });
  it("treats a zero or negative due day as the 1st", () => {
    expect(rentDueDate(2026, 6, 0)).toEqual(new Date(Date.UTC(2026, 6, 1)));
  });
});

describe("rentChargeForPeriod", () => {
  it("bills the asOf month for an active lease", () => {
    const spec = rentChargeForPeriod(lease, new Date("2026-07-10T00:00:00Z"))!;
    expect(spec.periodKey).toBe("2026-07");
    expect(spec.dueDate).toEqual(new Date(Date.UTC(2026, 6, 1)));
    expect(spec.amountCents).toBe(185_000);
    expect(spec.description).toBe("Rent for July 2026");
  });
  it("does not bill a draft or ended lease", () => {
    expect(rentChargeForPeriod({ ...lease, status: "DRAFT" }, new Date("2026-07-10T00:00:00Z"))).toBeNull();
  });
  it("does not bill months before the lease starts", () => {
    expect(rentChargeForPeriod(lease, new Date("2025-12-15T00:00:00Z"))).toBeNull();
  });
  it("does not bill months after the lease ends", () => {
    expect(rentChargeForPeriod(lease, new Date("2027-01-15T00:00:00Z"))).toBeNull();
  });
  it("bills the final month that overlaps the end date", () => {
    expect(rentChargeForPeriod(lease, new Date("2026-12-31T00:00:00Z"))?.periodKey).toBe("2026-12");
  });
  it("does not bill a zero-rent lease", () => {
    expect(rentChargeForPeriod({ ...lease, monthlyRentCents: 0 }, new Date("2026-07-10T00:00:00Z"))).toBeNull();
  });
});

describe("chargeOpenCents", () => {
  it("is the unpaid remainder", () => {
    expect(chargeOpenCents({ status: "PARTIALLY_PAID", amountCents: 185_000, amountPaidCents: 100_000 })).toBe(85_000);
  });
  it("is zero for a paid or void charge", () => {
    expect(chargeOpenCents({ status: "PAID", amountCents: 185_000, amountPaidCents: 185_000 })).toBe(0);
    expect(chargeOpenCents({ status: "VOID", amountCents: 185_000, amountPaidCents: 0 })).toBe(0);
  });
});

const charge = (over: Partial<ChargeView>): ChargeView => ({
  status: "PENDING",
  amountCents: 185_000,
  amountPaidCents: 0,
  dueDate: new Date("2026-07-01T00:00:00Z"),
  ...over,
});

describe("isOverdue / daysLate", () => {
  it("is overdue when open and past due", () => {
    expect(isOverdue(charge({}), new Date("2026-07-10T00:00:00Z"))).toBe(true);
    expect(daysLate(charge({}).dueDate, new Date("2026-07-10T00:00:00Z"))).toBe(9);
  });
  it("is not overdue on the due date itself", () => {
    expect(isOverdue(charge({}), new Date("2026-07-01T00:00:00Z"))).toBe(false);
    expect(daysLate(charge({}).dueDate, new Date("2026-07-01T00:00:00Z"))).toBe(0);
  });
  it("a paid charge is never overdue", () => {
    expect(isOverdue(charge({ status: "PAID", amountPaidCents: 185_000 }), new Date("2026-09-01T00:00:00Z"))).toBe(false);
  });
});

describe("summarizeBilling", () => {
  const asOf = new Date("2026-07-10T00:00:00Z");
  it("totals balance and past-due, and points at the next upcoming charge", () => {
    const s = summarizeBilling(
      [
        charge({ dueDate: new Date("2026-06-01T00:00:00Z") }), // overdue 185k
        charge({ dueDate: new Date("2026-08-01T00:00:00Z") }), // upcoming 185k
        charge({ status: "PAID", amountPaidCents: 185_000, dueDate: new Date("2026-05-01T00:00:00Z") }),
      ],
      asOf,
    );
    expect(s.balanceCents).toBe(370_000);
    expect(s.pastDueCents).toBe(185_000);
    expect(s.nextDueDate).toEqual(new Date("2026-08-01T00:00:00Z"));
    expect(s.nextDueCents).toBe(185_000);
  });
  it("is all zeros when nothing is open", () => {
    const s = summarizeBilling([charge({ status: "PAID", amountPaidCents: 185_000 })], asOf);
    expect(s).toEqual({ balanceCents: 0, pastDueCents: 0, nextDueDate: null, nextDueCents: 0 });
  });
});

describe("lateFeeForRent", () => {
  const rent = charge({ type: "RENT", periodKey: "2026-07" });
  it("charges the flat fee once grace has passed", () => {
    const fee = lateFeeForRent(rent, lease, new Date("2026-07-07T00:00:00Z"))!;
    expect(fee.amountCents).toBe(7_500);
    expect(fee.periodKey).toBe("2026-07");
    expect(fee.description).toBe("Late fee for 2026-07");
  });
  it("does not charge within the grace window", () => {
    expect(lateFeeForRent(rent, lease, new Date("2026-07-06T00:00:00Z"))).toBeNull();
  });
  it("does not charge when the rent is already paid", () => {
    expect(lateFeeForRent(charge({ status: "PAID", amountPaidCents: 185_000 }), lease, new Date("2026-08-01T00:00:00Z"))).toBeNull();
  });
  it("does not charge when the lease has no late fee", () => {
    expect(lateFeeForRent(rent, { ...lease, lateFeeCents: 0 }, new Date("2026-08-01T00:00:00Z"))).toBeNull();
  });
});
