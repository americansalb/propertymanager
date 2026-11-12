import { describe, expect, it } from "vitest";
import { splitBrandName } from "@/lib/brand-name";

describe("splitBrandName", () => {
  it("splits a camel-cased name at its last hump", () => {
    expect(splitBrandName("VillageKeep")).toEqual(["Village", "Keep"]);
  });
  it("splits a spaced name before its last word and keeps the space", () => {
    expect(splitBrandName("Village Keep")).toEqual(["Village ", "Keep"]);
    expect(splitBrandName("Old Town Keep")).toEqual(["Old Town ", "Keep"]);
  });
  it("leaves a single word whole", () => {
    expect(splitBrandName("Keep")).toEqual(["Keep", ""]);
    expect(splitBrandName("ACME")).toEqual(["ACME", ""]);
  });
  it("ignores surrounding whitespace", () => {
    expect(splitBrandName("  VillageKeep  ")).toEqual(["Village", "Keep"]);
  });
  it("always returns the whole name across the two parts", () => {
    for (const name of ["VillageKeep", "Village Keep", "Keep", "iRent", "A1Homes"]) {
      expect(splitBrandName(name).join("")).toBe(name);
    }
  });
});
