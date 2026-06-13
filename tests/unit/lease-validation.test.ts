import { describe, expect, it } from "vitest";
import { leaseUpdateSchema, toLeaseUpdateData } from "@/lib/validation/lease";

const parse = (body: unknown) => leaseUpdateSchema.safeParse(body);

describe("leaseUpdateSchema", () => {
  it("accepts decorated dollar strings and converts to cents", () => {
    const parsed = parse({ monthlyRentDollars: "$1,850", securityDepositDollars: "1850.50" });
    expect(parsed.success).toBe(true);
    expect(toLeaseUpdateData(parsed.data!)).toEqual({
      monthlyRentCents: 185_000,
      securityDepositCents: 185_050,
    });
  });

  it("clears per column nullability: null money goes to 0 or NULL as the schema demands", () => {
    const parsed = parse({
      securityDepositDollars: null,
      lateFeeDollars: null,
      petDepositDollars: null,
      parkingRentDollars: null,
      endDate: null,
    });
    expect(parsed.success).toBe(true);
    expect(toLeaseUpdateData(parsed.data!)).toEqual({
      securityDepositCents: 0,
      lateFeeCents: 0,
      petDepositCents: null,
      parkingRentCents: null,
      endDate: null,
    });
  });

  it("parses calendar dates at UTC midnight", () => {
    const parsed = parse({ startDate: "2026-07-01" });
    expect(parsed.success).toBe(true);
    const data = toLeaseUpdateData(parsed.data!);
    expect((data.startDate as Date).toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("rejects impossible dates and malformed dates", () => {
    expect(parse({ startDate: "2026-02-31" }).success).toBe(false);
    expect(parse({ startDate: "07/01/2026" }).success).toBe(false);
  });

  it("keeps the rent due day where every month has one", () => {
    expect(parse({ rentDueDay: 1 }).success).toBe(true);
    expect(parse({ rentDueDay: 28 }).success).toBe(true);
    expect(parse({ rentDueDay: 0 }).success).toBe(false);
    expect(parse({ rentDueDay: 29 }).success).toBe(false);
  });

  it("passes through the share switch and status, and normalizes utilities", () => {
    const parsed = parse({
      shareWithTenant: false,
      status: "ACTIVE",
      utilitiesIncluded: ["Water", " water ", "", "Trash"],
    });
    expect(parsed.success).toBe(true);
    expect(toLeaseUpdateData(parsed.data!)).toEqual({
      shareWithTenant: false,
      status: "ACTIVE",
      utilitiesIncluded: ["Water", "Trash"],
    });
  });

  it("canonicalizes shared fields and rejects unknown ones", () => {
    const parsed = parse({ sharedFields: ["PARKING", "RENT", "RENT", "TERM"] });
    expect(parsed.success).toBe(true);
    expect(toLeaseUpdateData(parsed.data!)).toEqual({
      sharedFields: ["RENT", "TERM", "PARKING"],
    });
    expect(parse({ sharedFields: ["RENT", "SECRETS"] }).success).toBe(false);
  });

  it("only touches provided keys", () => {
    const parsed = parse({});
    expect(parsed.success).toBe(true);
    expect(toLeaseUpdateData(parsed.data!)).toEqual({});
  });
});
