import { describe, expect, it } from "vitest";
import {
  CATALOG,
  missingForPublish,
  parseZips,
  priceLine,
  slugify,
  tasksForTrades,
} from "@/lib/pro-catalog";
import { TRADES } from "@/lib/quotes";

describe("the job catalog", () => {
  it("never repeats a key, and every job belongs to a real trade", () => {
    const keys = CATALOG.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of CATALOG) expect(TRADES).toContain(c.trade);
  });

  it("gives a maintenance pro the small rental fixes", () => {
    const labels = tasksForTrades(["HANDYMAN"]).map((t) => t.label);
    expect(labels).toContain("Patch drywall");
    expect(labels).not.toContain("Clear a clogged drain");
  });
});

describe("pro page helpers", () => {
  it("writes prices the way people say them", () => {
    expect(priceLine(12_000, "job")).toBe("From $120.00");
    expect(priceLine(6_500, "hour")).toBe("From $65.00 an hour");
    expect(priceLine(30_000, "room")).toBe("From $300.00 a room");
  });

  it("makes a clean link from a business name", () => {
    expect(slugify("Mike's Plumbing & Heating")).toBe("mikes-plumbing-heating");
    expect(slugify("  ")).toBe("pro");
    expect(slugify("Señor Fix-It, LLC")).toBe("senor-fix-it-llc");
  });

  it("reads ZIP codes however they are typed, once each", () => {
    expect(parseZips("60657, 60614 60613\n60657")).toEqual(["60657", "60614", "60613"]);
    expect(parseZips("6065 1234567")).toEqual([]);
  });

  it("lists what is missing before a page can go public", () => {
    expect(
      missingForPublish({ emailConfirmed: false, trades: [], zipCount: 0, priceCount: 0, hourlyRateCents: null }),
    ).toEqual(["Confirm your email", "Pick what you do", "Add at least one price", "Add the ZIP codes you work in"]);
    expect(
      missingForPublish({ emailConfirmed: true, trades: ["HANDYMAN"], zipCount: 2, priceCount: 0, hourlyRateCents: 6_500 }),
    ).toEqual([]);
  });
});
