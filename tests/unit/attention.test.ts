import { describe, expect, it } from "vitest";
import {
  buildSampleItem,
  buildVacancyItems,
  computeSetup,
  sortAttention,
  type AttentionItem,
} from "@/lib/attention";

describe("computeSetup", () => {
  it("starts at the first step for an empty org", () => {
    const s = computeSetup({ propertyCount: 0, unitsWithRent: 0 });
    expect(s.complete).toBe(false);
    expect(s.steps[0]).toMatchObject({ key: "property", done: false });
  });

  it("advances to rents once a property exists", () => {
    const s = computeSetup({ propertyCount: 1, unitsWithRent: 0 });
    expect(s.steps[0]!.done).toBe(true);
    expect(s.steps[1]!.done).toBe(false);
    expect(s.complete).toBe(false);
  });

  it("is complete when all buildable steps are done (soon steps excluded)", () => {
    const s = computeSetup({ propertyCount: 1, unitsWithRent: 2 });
    expect(s.complete).toBe(true);
    expect(s.steps.filter((x) => x.soon)).toHaveLength(2);
  });
});

describe("buildVacancyItems", () => {
  it("carries the stake and links to the property", () => {
    const [item] = buildVacancyItems([
      {
        unitId: "u1",
        unitNumber: "2F",
        propertyId: "p1",
        propertyName: "Oakdale Duplex",
        marketRentCents: 192_500,
      },
    ]);
    expect(item).toMatchObject({
      kind: "vacancy",
      cls: "OPTIMIZATION",
      title: "2F at Oakdale Duplex is vacant",
      stakeCents: 192_500,
      action: { href: "/landlord/properties/p1" },
    });
    expect(item!.meta).toContain("$1,925.00");
  });
});

describe("sortAttention", () => {
  const mk = (id: string, cls: AttentionItem["cls"], stake = 0): AttentionItem => ({
    id,
    kind: "vacancy",
    cls,
    title: id,
    stakeCents: stake,
    action: { label: "x", href: "/" },
  });

  it("orders by class, then by dollars at stake", () => {
    const sorted = sortAttention([
      mk("setup", "SETUP"),
      mk("small-vacancy", "OPTIMIZATION", 100_000),
      mk("late-rent", "MONEY_TO_YOU", 185_000),
      mk("big-vacancy", "OPTIMIZATION", 200_000),
      mk("release", "MONEY_ON_YOU", 50_000),
    ]);
    expect(sorted.map((i) => i.id)).toEqual([
      "release",
      "late-rent",
      "big-vacancy",
      "small-vacancy",
      "setup",
    ]);
  });
});

describe("buildSampleItem", () => {
  it("is housekeeping-class and carries the property ref for removal", () => {
    const item = buildSampleItem({ id: "p9", name: "Sample: Oakdale Duplex" });
    expect(item.cls).toBe("SETUP");
    expect(item.refId).toBe("p9");
  });
});
