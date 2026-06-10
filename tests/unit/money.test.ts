import { describe, expect, it } from "vitest";
import { allocateOldestFirst, feeFromBps, formatCents, netAfterFee } from "@/lib/money";

describe("feeFromBps", () => {
  it("computes the default 10% take rate", () => {
    expect(feeFromBps(27_500, 1000)).toBe(2_750); // $275 job → $27.50 fee
  });
  it("rounds half-up to the nearest cent", () => {
    expect(feeFromBps(333, 1000)).toBe(33); // 33.3 → 33
    expect(feeFromBps(335, 1000)).toBe(34); // 33.5 → 34
  });
  it("handles 0 bps (launch rent fee)", () => {
    expect(feeFromBps(185_000, 0)).toBe(0);
  });
  it("never exceeds the principal", () => {
    expect(feeFromBps(1, 10_000)).toBe(1);
  });
  it("rejects invalid input", () => {
    expect(() => feeFromBps(-1, 1000)).toThrow();
    expect(() => feeFromBps(100, 10_001)).toThrow();
    expect(() => feeFromBps(100.5, 1000)).toThrow();
  });
});

describe("netAfterFee", () => {
  it("pro receives amount minus take rate", () => {
    expect(netAfterFee(50_000, 1000)).toBe(45_000);
  });
});

describe("allocateOldestFirst", () => {
  const charges = [
    { id: "feb", dueDate: new Date("2026-02-01"), amountCents: 100_000, amountPaidCents: 0 },
    { id: "jan", dueDate: new Date("2026-01-01"), amountCents: 100_000, amountPaidCents: 40_000 },
  ];

  it("pays the oldest outstanding charge first", () => {
    const { allocations, remainderCents } = allocateOldestFirst(70_000, charges);
    expect(allocations).toEqual([
      { chargeId: "jan", amountCents: 60_000 },
      { chargeId: "feb", amountCents: 10_000 },
    ]);
    expect(remainderCents).toBe(0);
  });

  it("returns overpayment as remainder credit", () => {
    const { allocations, remainderCents } = allocateOldestFirst(200_000, charges);
    expect(allocations.reduce((s, a) => s + a.amountCents, 0)).toBe(160_000);
    expect(remainderCents).toBe(40_000);
  });

  it("skips fully paid charges", () => {
    const paid = [{ id: "x", dueDate: new Date(), amountCents: 100, amountPaidCents: 100 }];
    const { allocations, remainderCents } = allocateOldestFirst(500, paid);
    expect(allocations).toEqual([]);
    expect(remainderCents).toBe(500);
  });
});
