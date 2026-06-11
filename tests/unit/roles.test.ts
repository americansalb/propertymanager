import { describe, expect, it } from "vitest";
import { computeRoles, defaultPortal } from "@/lib/authz/roles";

const base = { isSuperAdmin: false, memberships: [], tenantProfile: null, proProfile: null };

describe("computeRoles", () => {
  it("derives LANDLORD from membership", () => {
    expect(computeRoles({ ...base, memberships: [{}] })).toEqual(["LANDLORD"]);
  });
  it("derives all roles for one human with many hats", () => {
    expect(
      computeRoles({ isSuperAdmin: true, memberships: [{}], tenantProfile: {}, proProfile: {} }),
    ).toEqual(["LANDLORD", "TENANT", "PRO", "ADMIN"]);
  });
  it("returns empty for a bare user", () => {
    expect(computeRoles(base)).toEqual([]);
  });
});

describe("defaultPortal", () => {
  it("prioritizes landlord portal", () => {
    expect(defaultPortal(["LANDLORD", "PRO"])).toBe("/landlord/dashboard");
  });
  it("honors a valid activeRole override", () => {
    expect(defaultPortal(["LANDLORD", "PRO"], "PRO")).toBe("/pro/dashboard");
  });
  it("ignores an activeRole the user does not hold", () => {
    expect(defaultPortal(["TENANT"], "LANDLORD")).toBe("/tenant/dashboard");
  });
  it("falls back to login with no roles", () => {
    expect(defaultPortal([])).toBe("/login");
  });
});
