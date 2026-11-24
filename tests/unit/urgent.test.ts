import { describe, expect, it } from "vitest";
import {
  EMERGENCY,
  EMERGENCY_KINDS,
  SPOTS,
  approvalLimitCents,
  askedSummary,
  isEmergencyKind,
  isSpot,
  knownSpots,
  nameList,
  spotFromKind,
  spotKind,
} from "@/lib/urgent";
import { TRADES_FOR_CATEGORY, ruleApproves } from "@/lib/quotes";
import { emergencyReportSchema, landlordRepairSchema } from "@/lib/validation/maintenance";
import { quoteRequestEmail } from "@/lib/email/templates/quote";

describe("spots", () => {
  it("round-trips a spot through its attachment kind, and refuses anything else", () => {
    for (const s of SPOTS) expect(spotFromKind(spotKind(s))).toBe(s);
    expect(spotFromKind("PHOTO")).toBeNull();
    expect(spotFromKind("SPOT_ROOF")).toBeNull();
    expect(isSpot("WATER")).toBe(true);
    expect(isSpot("water")).toBe(false);
    expect(isSpot(null)).toBe(false);
  });

  it("shows only the spots the owner said something about", () => {
    const spots = [
      { spot: "WATER" as const, label: "Water shutoff", where: "Basement", photoUrl: null },
      { spot: "BREAKER" as const, label: "Breaker panel", where: null, photoUrl: "/api/v1/files/x" },
      { spot: "GAS" as const, label: "Gas shutoff", where: null, photoUrl: null },
    ];
    expect(knownSpots(spots).map((s) => s.spot)).toEqual(["WATER", "BREAKER"]);
  });
});

describe("emergency plans", () => {
  it("gives every kind something to do right now and a repair to become", () => {
    for (const k of EMERGENCY_KINDS) {
      const plan = EMERGENCY[k];
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.title.length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(TRADES_FOR_CATEGORY)).toContain(plan.category);
      if (plan.spot) expect(isSpot(plan.spot)).toBe(true);
    }
  });

  it("points a leak at the water shutoff and a power cut at the panel", () => {
    expect(EMERGENCY.WATER.spot).toBe("WATER");
    expect(EMERGENCY.WATER.category).toBe("PLUMBING");
    expect(EMERGENCY.POWER.spot).toBe("BREAKER");
    expect(EMERGENCY.HEAT.spot).toBe("FURNACE");
  });

  it("never sends the owner's people, or the tenant, toward a gas leak", () => {
    expect(EMERGENCY.GAS.askPeople).toBe(false);
    expect(EMERGENCY.GAS.spot).toBeNull();
    expect(EMERGENCY.GAS.steps.join(" ")).toContain("911");
    expect(EMERGENCY.GAS.steps[0]).toMatch(/^Leave/);
  });

  it("knows a kind from a stranger's input", () => {
    expect(isEmergencyKind("WATER")).toBe(true);
    expect(isEmergencyKind("FIRE")).toBe(false);
    expect(emergencyReportSchema.safeParse({ kind: "FIRE" }).success).toBe(false);
    const ok = emergencyReportSchema.parse({ kind: "WATER", details: "   " });
    expect(ok.details).toBeUndefined();
  });
});

describe("who may say yes", () => {
  it("uses only the person's limit on an ordinary repair", () => {
    expect(
      approvalLimitCents({ personLimitCents: 30000, emergencyLimitCents: 50000, emergency: false }),
    ).toBe(30000);
    expect(
      approvalLimitCents({ personLimitCents: null, emergencyLimitCents: 50000, emergency: false }),
    ).toBeNull();
  });

  it("lets the emergency limit say yes for someone with no limit of their own", () => {
    expect(
      approvalLimitCents({ personLimitCents: null, emergencyLimitCents: 25000, emergency: true }),
    ).toBe(25000);
  });

  it("takes the higher of the two in an emergency, never the lower", () => {
    expect(
      approvalLimitCents({ personLimitCents: 40000, emergencyLimitCents: 25000, emergency: true }),
    ).toBe(40000);
    expect(
      approvalLimitCents({ personLimitCents: 10000, emergencyLimitCents: 25000, emergency: true }),
    ).toBe(25000);
  });

  it("still asks the owner when no emergency limit is set", () => {
    const limit = approvalLimitCents({
      personLimitCents: null,
      emergencyLimitCents: null,
      emergency: true,
    });
    expect(limit).toBeNull();
    expect(
      ruleApproves({
        limitCents: limit,
        priceLowCents: 9500,
        priceHighCents: null,
        someoneAlreadyApproved: false,
      }),
    ).toBe(false);
  });

  it("approves a call-out under the emergency limit and holds one over it", () => {
    const limitCents = approvalLimitCents({
      personLimitCents: null,
      emergencyLimitCents: 25000,
      emergency: true,
    });
    const base = { limitCents, priceHighCents: null, someoneAlreadyApproved: false };
    expect(ruleApproves({ ...base, priceLowCents: 9500 })).toBe(true);
    expect(ruleApproves({ ...base, priceLowCents: 25000 })).toBe(true);
    expect(ruleApproves({ ...base, priceLowCents: 25001 })).toBe(false);
    // The top of a range is what counts.
    expect(ruleApproves({ ...base, priceLowCents: 9500, priceHighCents: 40000 })).toBe(false);
  });
});

describe("what the owner is told", () => {
  it("lists names the way a person would", () => {
    expect(nameList([])).toBe("");
    expect(nameList(["Mike"])).toBe("Mike");
    expect(nameList(["Mike", "Ana"])).toBe("Mike and Ana");
    expect(nameList(["Mike", "Ana", "Lee"])).toBe("Mike, Ana and Lee");
  });

  it("says who was asked, and names the ones only the owner can reach", () => {
    const asked = [
      { name: "Mike", emailed: true },
      { name: "Ana", emailed: false },
    ];
    expect(askedSummary({ asked, emergency: true })).toBe(
      " We asked Mike to come. Ana could not be emailed: text or call them yourself.",
    );
    expect(askedSummary({ asked: [asked[0]!], emergency: false })).toBe(
      " We asked Mike for a price.",
    );
  });

  it("is honest when nobody was asked in an emergency", () => {
    expect(askedSummary({ asked: [], emergency: true })).toContain("nobody has been asked yet");
    expect(askedSummary({ asked: [], emergency: true, skipped: "OFF" })).toContain("is off");
    expect(askedSummary({ asked: [], emergency: true, skipped: "NOT_THEIR_JOB" })).toContain("911");
    // An ordinary repair with nobody to ask needs no extra sentence.
    expect(askedSummary({ asked: [], emergency: false })).toBe("");
    expect(askedSummary({ asked: [], emergency: false, skipped: "OFF" })).toBe("");
  });
});

describe("a repair the owner writes down", () => {
  it("needs a home, a kind and a few words, and nothing else", () => {
    const ok = landlordRepairSchema.parse({
      unitId: "u1",
      category: "PLUMBING",
      title: "Sink leaks",
      urgency: "NORMAL",
    });
    expect(ok.description).toBe("");
    expect(ok.permissionToEnter).toBe(false);
    expect(landlordRepairSchema.safeParse({ ...ok, unitId: "" }).success).toBe(false);
    expect(landlordRepairSchema.safeParse({ ...ok, title: "x" }).success).toBe(false);
  });
});

describe("the emergency email", () => {
  it("asks if they can come, not for a price for later", () => {
    const mail = quoteRequestEmail({
      brandName: "VillageKeep",
      ownerName: "Dana Landlord",
      contractorName: "Mike's Plumbing",
      title: "Water <leak>",
      description: "Basement is filling.",
      where: "Unit 1F, 1247 W Oakdale Ave, Chicago",
      urgent: true,
      emergency: true,
      link: "https://example.com/quote/abc",
    });
    expect(mail.subject).toBe("Emergency: Dana Landlord needs someone now: Water <leak>");
    expect(mail.text).toContain("https://example.com/quote/abc");
    expect(mail.text).toContain("The first person who can come gets the job.");
    expect(mail.html).toContain("I can come");
    expect(mail.html).toContain("Water &lt;leak&gt;");
    expect(mail.html).not.toContain("<leak>");
  });
});
