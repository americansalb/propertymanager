import { describe, expect, it } from "vitest";
import {
  buildMaintenanceItems,
  buildSampleItem,
  buildVacancyItems,
  computeSetup,
  sortAttention,
  type AttentionItem,
} from "@/lib/attention";

describe("computeSetup", () => {
  const empty = { propertyCount: 0, unitsWithRent: 0, tenantInvites: 0, tenantsJoined: 0 };

  it("starts at the first step for an empty org", () => {
    const s = computeSetup(empty);
    expect(s.complete).toBe(false);
    expect(s.steps[0]).toMatchObject({ key: "property", done: false });
  });

  it("advances to rents once a property exists", () => {
    const s = computeSetup({ ...empty, propertyCount: 1 });
    expect(s.steps[0]!.done).toBe(true);
    expect(s.steps[1]!.done).toBe(false);
    expect(s.complete).toBe(false);
  });

  it("counts the invite step done once an invite is sent OR a tenant joined", () => {
    const sent = computeSetup({ ...empty, tenantInvites: 1 });
    expect(sent.steps.find((x) => x.key === "invite")).toMatchObject({
      done: true,
      href: "/landlord/properties",
    });
    const joined = computeSetup({ ...empty, tenantsJoined: 1 });
    expect(joined.steps.find((x) => x.key === "invite")!.done).toBe(true);
  });

  it("is complete when all buildable steps are done (soon steps excluded)", () => {
    const s = computeSetup({ propertyCount: 1, unitsWithRent: 2, tenantInvites: 0, tenantsJoined: 0 });
    expect(s.complete).toBe(false); // invite step is live now and not done
    const done = computeSetup({ propertyCount: 1, unitsWithRent: 2, tenantInvites: 1, tenantsJoined: 0 });
    expect(done.complete).toBe(true);
    expect(done.steps.filter((x) => x.soon)).toHaveLength(1); // bank remains
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

describe("buildMaintenanceItems", () => {
  const base = {
    id: "m1",
    title: "No hot water",
    unitNumber: "2F",
    propertyId: "p1",
    propertyName: "Oakdale Duplex",
  };

  it("ranks an emergency in the EMERGENCY class, linked to review", () => {
    const [item] = buildMaintenanceItems([{ ...base, urgency: "EMERGENCY" }]);
    expect(item).toMatchObject({
      kind: "maintenance",
      cls: "EMERGENCY",
      action: { label: "Review", href: "/landlord/maintenance/m1" },
    });
    expect(item!.title).toContain("2F at Oakdale Duplex");
  });

  it("puts non-emergency open work in NEEDS_RESPONSE", () => {
    const [item] = buildMaintenanceItems([{ ...base, urgency: "URGENT" }]);
    expect(item!.cls).toBe("NEEDS_RESPONSE");
  });

  it("sorts an emergency above late rent and a vacancy", () => {
    const sorted = sortAttention([
      ...buildVacancyItems([
        { unitId: "u", unitNumber: "3R", propertyId: "p", propertyName: "X", marketRentCents: 120_000 },
      ]),
      ...buildMaintenanceItems([{ ...base, urgency: "EMERGENCY" }]),
    ]);
    expect(sorted[0]!.kind).toBe("maintenance");
    expect(sorted[0]!.cls).toBe("EMERGENCY");
  });
});
