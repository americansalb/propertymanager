import { describe, expect, it } from "vitest";
import {
  MAX_ASKED,
  buildQuoteLink,
  formatQuotePrice,
  phoneHref,
  pickContractors,
  quoteCeilingCents,
  ruleApproves,
} from "@/lib/quotes";

const person = (id: string, trades: string[], archived = false) => ({
  id,
  trades,
  archivedAt: archived ? new Date() : null,
});

describe("pickContractors", () => {
  const people = [
    person("plumber", ["PLUMBING"]),
    person("locksmith", ["LOCKSMITH"]),
    person("handyman", ["HANDYMAN"]),
    person("old-plumber", ["PLUMBING"], true),
  ];

  it("asks the specialists for that kind of problem", () => {
    expect(pickContractors("PLUMBING", people).map((p) => p.id)).toEqual(["plumber"]);
    expect(pickContractors("DOORS_LOCKS", people).map((p) => p.id)).toEqual(["locksmith"]);
  });

  it("never asks someone the owner removed", () => {
    expect(pickContractors("PLUMBING", people).map((p) => p.id)).not.toContain("old-plumber");
  });

  it("falls back to the handyman when there is no specialist", () => {
    expect(pickContractors("ELECTRICAL", people).map((p) => p.id)).toEqual(["handyman"]);
    expect(pickContractors("OTHER", people).map((p) => p.id)).toEqual(["handyman"]);
  });

  it("does not add the handyman when a specialist exists", () => {
    expect(pickContractors("PLUMBING", people).map((p) => p.id)).not.toContain("handyman");
  });

  it("asks nobody when nobody fits", () => {
    expect(pickContractors("ELECTRICAL", [person("locksmith", ["LOCKSMITH"])])).toEqual([]);
  });

  it("caps how many people one repair goes to", () => {
    const many = Array.from({ length: 9 }, (_, i) => person(`p${i}`, ["PLUMBING"]));
    expect(pickContractors("PLUMBING", many)).toHaveLength(MAX_ASKED);
  });
});

describe("ruleApproves", () => {
  const base = { priceLowCents: 18_000, priceHighCents: null, someoneAlreadyApproved: false };

  it("never approves without a limit: the owner is asked by default", () => {
    expect(ruleApproves({ ...base, limitCents: null })).toBe(false);
  });

  it("approves a price at or under the limit", () => {
    expect(ruleApproves({ ...base, limitCents: 30_000 })).toBe(true);
    expect(ruleApproves({ ...base, limitCents: 18_000 })).toBe(true);
  });

  it("does not approve a price over the limit", () => {
    expect(ruleApproves({ ...base, limitCents: 17_999 })).toBe(false);
  });

  it("judges a range by the most it could cost", () => {
    const range = { ...base, priceLowCents: 15_000, priceHighCents: 35_000 };
    expect(ruleApproves({ ...range, limitCents: 30_000 })).toBe(false);
    expect(ruleApproves({ ...range, limitCents: 35_000 })).toBe(true);
  });

  it("never approves a second person for the same repair", () => {
    expect(ruleApproves({ ...base, limitCents: 30_000, someoneAlreadyApproved: true })).toBe(false);
  });
});

describe("quote helpers", () => {
  it("shows one price or a range", () => {
    expect(formatQuotePrice(18_000, null)).toBe("$180.00");
    expect(formatQuotePrice(15_000, 30_000)).toBe("$150.00 to $300.00");
    expect(formatQuotePrice(15_000, 15_000)).toBe("$150.00");
  });

  it("sorts by the most a job could cost", () => {
    expect(quoteCeilingCents(15_000, 30_000)).toBe(30_000);
    expect(quoteCeilingCents(18_000, null)).toBe(18_000);
  });

  it("builds the private link", () => {
    expect(buildQuoteLink("https://example.com", "abc")).toBe("https://example.com/quote/abc");
  });

  it("turns a typed phone number into something a phone can dial", () => {
    expect(phoneHref("(312) 555-0142")).toBe("+13125550142");
    expect(phoneHref("1 312 555 0142")).toBe("+13125550142");
    expect(phoneHref("+44 20 7946 0958")).toBe("+442079460958");
    expect(phoneHref("12")).toBeNull();
  });
});
