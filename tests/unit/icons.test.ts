import { describe, expect, it } from "vitest";
import { ICONS } from "@/components/icons/paths";

// The proprietary language is enforceable: solid fills built from straight
// segments only. A curve command sneaking in means someone pasted a generic
// icon - fail the build.
describe("icon language", () => {
  it("has at least the core set", () => {
    expect(ICONS.length).toBeGreaterThanOrEqual(25);
  });

  it("uses unique names", () => {
    const names = ICONS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("contains only straight-line path commands (M/L/H/V/Z, no curves)", () => {
    for (const icon of ICONS) {
      for (const p of icon.paths) {
        expect(p.d, `${icon.name} must not use curve commands`).toMatch(
          /^[MLHVZ0-9 .\-]+$/,
        );
      }
    }
  });

  it("keeps every coordinate inside the 24px grid", () => {
    for (const icon of ICONS) {
      for (const p of icon.paths) {
        const numbers = p.d.match(/-?\d+(\.\d+)?/g) ?? [];
        for (const n of numbers) {
          const v = Number(n);
          expect(v, `${icon.name}: coordinate ${v} out of grid`).toBeGreaterThanOrEqual(0);
          expect(v, `${icon.name}: coordinate ${v} out of grid`).toBeLessThanOrEqual(24);
        }
      }
    }
  });
});
