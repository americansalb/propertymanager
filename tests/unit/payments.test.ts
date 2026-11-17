import { describe, expect, it } from "vitest";
import { arrivedOnTime, planOfflinePayment, statusAfter, type ChargeForPlan } from "@/lib/payments";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const rent = (id: string, period: string, due: string, paid = 0): ChargeForPlan => ({
  id,
  type: "RENT",
  status: paid > 0 ? "PARTIALLY_PAID" : "PENDING",
  amountCents: 185_000,
  amountPaidCents: paid,
  dueDate: d(due),
  periodKey: period,
});
const fee = (id: string, period: string, on: string): ChargeForPlan => ({
  id,
  type: "LATE_FEE",
  status: "PENDING",
  amountCents: 7_500,
  amountPaidCents: 0,
  dueDate: d(on),
  periodKey: period,
});

describe("arrivedOnTime", () => {
  it("counts the whole last day of the grace period as on time", () => {
    expect(arrivedOnTime(d("2026-11-01"), 5, d("2026-11-06"))).toBe(true);
    expect(arrivedOnTime(d("2026-11-01"), 5, d("2026-11-07"))).toBe(false);
    expect(arrivedOnTime(d("2026-11-01"), 0, d("2026-11-01"))).toBe(true);
  });
});

describe("planOfflinePayment", () => {
  it("pays the oldest rent first", () => {
    const plan = planOfflinePayment({
      amountCents: 185_000,
      receivedOn: d("2026-11-02"),
      graceDays: 5,
      charges: [rent("nov", "2026-11", "2026-11-01"), rent("oct", "2026-10", "2026-10-01")],
    });
    expect(plan.allocations).toEqual([{ chargeId: "oct", amountCents: 185_000 }]);
    expect(plan.remainderCents).toBe(0);
  });

  it("wipes a late fee when the rent turns out to have arrived on time", () => {
    // Rent due Nov 1, five days grace, fee added Nov 7, but the money came Nov 3.
    const plan = planOfflinePayment({
      amountCents: 185_000,
      receivedOn: d("2026-11-03"),
      graceDays: 5,
      charges: [rent("nov", "2026-11", "2026-11-01"), fee("fee", "2026-11", "2026-11-07")],
    });
    expect(plan.voidChargeIds).toEqual(["fee"]);
    expect(plan.allocations).toEqual([{ chargeId: "nov", amountCents: 185_000 }]);
    expect(plan.owedCents).toBe(185_000);
  });

  it("keeps the late fee when the rent really was late", () => {
    const plan = planOfflinePayment({
      amountCents: 192_500,
      receivedOn: d("2026-11-10"),
      graceDays: 5,
      charges: [rent("nov", "2026-11", "2026-11-01"), fee("fee", "2026-11", "2026-11-07")],
    });
    expect(plan.voidChargeIds).toEqual([]);
    expect(plan.allocations).toEqual([
      { chargeId: "nov", amountCents: 185_000 },
      { chargeId: "fee", amountCents: 7_500 },
    ]);
  });

  it("keeps the fee when an on-time payment covers only part of the rent", () => {
    const plan = planOfflinePayment({
      amountCents: 100_000,
      receivedOn: d("2026-11-03"),
      graceDays: 5,
      charges: [rent("nov", "2026-11", "2026-11-01"), fee("fee", "2026-11", "2026-11-07")],
    });
    expect(plan.voidChargeIds).toEqual([]);
    expect(plan.allocations).toEqual([{ chargeId: "nov", amountCents: 100_000 }]);
  });

  it("reports money beyond what they owe", () => {
    const plan = planOfflinePayment({
      amountCents: 200_000,
      receivedOn: d("2026-11-03"),
      graceDays: 5,
      charges: [rent("nov", "2026-11", "2026-11-01")],
    });
    expect(plan.remainderCents).toBe(15_000);
    expect(plan.owedCents).toBe(185_000);
  });

  it("finishes a partly paid rent", () => {
    const plan = planOfflinePayment({
      amountCents: 85_000,
      receivedOn: d("2026-11-03"),
      graceDays: 5,
      charges: [rent("nov", "2026-11", "2026-11-01", 100_000)],
    });
    expect(plan.allocations).toEqual([{ chargeId: "nov", amountCents: 85_000 }]);
    expect(plan.remainderCents).toBe(0);
  });
});

describe("statusAfter", () => {
  it("reads the paid amount", () => {
    expect(statusAfter(185_000, 0)).toBe("PENDING");
    expect(statusAfter(185_000, 1)).toBe("PARTIALLY_PAID");
    expect(statusAfter(185_000, 185_000)).toBe("PAID");
  });
});
