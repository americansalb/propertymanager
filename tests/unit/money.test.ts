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

  it("rejects a negative payment (no fabricated credit)", () => {
    expect(() => allocateOldestFirst(-5000, charges)).toThrow();
  });

  it("rejects a fractional payment (no fractional cents)", () => {
    expect(() => allocateOldestFirst(1850.5, charges)).toThrow();
  });

  it("breaks same-day ties by id, deterministically", () => {
    const sameDay = [
      { id: "late-fee", dueDate: new Date("2026-03-01"), amountCents: 7_500, amountPaidCents: 0 },
      { id: "rent", dueDate: new Date("2026-03-01"), amountCents: 185_000, amountPaidCents: 0 },
    ];
    // Regardless of input order, allocation order is stable (id-sorted).
    const a = allocateOldestFirst(1_000, sameDay);
    const b = allocateOldestFirst(1_000, [...sameDay].reverse());
    expect(a.allocations).toEqual(b.allocations);
    expect(a.allocations[0]!.chargeId).toBe("late-fee");
  });
});

describe("safeNext (open-redirect guard)", () => {
  it("keeps same-origin paths", async () => {
    const { safeNext } = await import("@/components/auth/auth-forms");
    expect(safeNext("/landlord/dashboard")).toBe("/landlord/dashboard");
    expect(safeNext("/tenant/payments?x=1")).toBe("/tenant/payments?x=1");
  });

  it("rejects off-site and protocol-relative targets", async () => {
    const { safeNext } = await import("@/components/auth/auth-forms");
    expect(safeNext("https://evil.example/verify")).toBeNull();
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("/\\evil.example")).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext("relative/path")).toBeNull();
  });
});

describe("getClientIp (rate-limit key trust)", () => {
  it("trusts the last hop, not the client-supplied first entry", async () => {
    const { getClientIp } = await import("@/lib/request");
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 9.9.9.9" },
    });
    // 1.1.1.1 is attacker-chosen; 9.9.9.9 is what Render's LB appended.
    expect(getClientIp(req)).toBe("9.9.9.9");
  });
});
