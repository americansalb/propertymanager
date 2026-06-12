import { describe, expect, it } from "vitest";
import { pickBody, pickVariant } from "@/components/brand/property-portrait";
import { BRICK, BRICK_DEEP, IRON } from "@/components/brand/palette";

// Founder-locked type truth: a building is a building no matter how few
// units it has, and a condo is a unit inside one.
describe("pickVariant", () => {
  it("multifamily is ALWAYS a building, even with one or two units", () => {
    expect(pickVariant("MULTIFAMILY", 1)).toBe("building");
    expect(pickVariant("MULTIFAMILY", 2)).toBe("building");
    expect(pickVariant("MULTIFAMILY", 12)).toBe("building");
  });
  it("commercial is always a building", () => {
    expect(pickVariant("COMMERCIAL", 1)).toBe("building");
  });
  it("a condo is a unit inside a building", () => {
    expect(pickVariant("CONDO", 1)).toBe("condo");
  });
  it("single family and townhouse keep their forms", () => {
    expect(pickVariant("SINGLE_FAMILY", 1)).toBe("house");
    expect(pickVariant("TOWNHOUSE", 1)).toBe("rowhouse");
  });
  it("OTHER falls back to size heuristic", () => {
    expect(pickVariant("OTHER", 2)).toBe("house");
    expect(pickVariant("OTHER", 5)).toBe("building");
  });
});

describe("pickBody (the village is brick)", () => {
  it("emits only brick, deep brick, or iron, with brick the clear majority", () => {
    const counts = { [BRICK]: 0, [BRICK_DEEP]: 0, [IRON]: 0 } as Record<string, number>;
    for (let seed = 0; seed < 200; seed++) {
      const body = pickBody(seed);
      expect([BRICK, BRICK_DEEP, IRON]).toContain(body);
      counts[body] = (counts[body] ?? 0) + 1;
    }
    expect(counts[BRICK]!).toBeGreaterThan(counts[BRICK_DEEP]!);
    expect(counts[BRICK]!).toBeGreaterThan(counts[IRON]!);
    expect(counts[IRON]!).toBeGreaterThan(0);
  });
});
