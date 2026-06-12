import { describe, expect, it } from "vitest";
import { parseUnitPattern } from "@/lib/unit-pattern";

describe("parseUnitPattern", () => {
  it("passes literals through", () => {
    expect(parseUnitPattern("1F, 2F, Garden")).toEqual(["1F", "2F", "Garden"]);
  });

  it("expands numeric ranges", () => {
    expect(parseUnitPattern("101-104")).toEqual(["101", "102", "103", "104"]);
  });

  it("expands prefixed numeric ranges when prefixes match", () => {
    expect(parseUnitPattern("Apt 1-Apt 3")).toEqual(["Apt 1", "Apt 2", "Apt 3"]);
  });

  it("preserves leading zeros", () => {
    expect(parseUnitPattern("01-03")).toEqual(["01", "02", "03"]);
  });

  it("expands letter ranges", () => {
    expect(parseUnitPattern("A-D")).toEqual(["A", "B", "C", "D"]);
  });

  it("mixes ranges and literals, deduping case-insensitively", () => {
    expect(parseUnitPattern("1F, 1-2, 1f")).toEqual(["1F", "1", "2"]);
  });

  it("treats a backwards range as a literal", () => {
    expect(parseUnitPattern("9-3")).toEqual(["9-3"]);
  });

  it("caps the result at 200 units", () => {
    expect(parseUnitPattern("1-500")).toEqual(["1-500"]); // oversized range stays literal
    expect(parseUnitPattern("1-200")).toHaveLength(200);
  });

  it("ignores empties and trims whitespace", () => {
    expect(parseUnitPattern("  1F ,, 2F  ")).toEqual(["1F", "2F"]);
  });
});
