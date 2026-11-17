import { describe, expect, it } from "vitest";
import { bidBlocker, bidsCloseAt, closesLabel, isOpenTrade, openTradeForCategory } from "@/lib/projects";

describe("which work goes out to nearby pros", () => {
  it("keeps licensed work with the owner's own people", () => {
    expect(openTradeForCategory("PLUMBING")).toBeNull();
    expect(openTradeForCategory("ELECTRICAL")).toBeNull();
    expect(openTradeForCategory("HVAC")).toBeNull();
    expect(openTradeForCategory("PEST")).toBeNull();
    expect(isOpenTrade("PLUMBING")).toBe(false);
    expect(isOpenTrade("LOCKSMITH")).toBe(false);
  });

  it("sends small fixes to maintenance pros", () => {
    expect(openTradeForCategory("FLOORING_WALLS")).toBe("HANDYMAN");
    expect(openTradeForCategory("DOORS_LOCKS")).toBe("HANDYMAN");
    expect(openTradeForCategory("APPLIANCE")).toBe("APPLIANCE_REPAIR");
    expect(isOpenTrade("CLEANING")).toBe(true);
  });
});

describe("bidBlocker", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  const pro = { published: true, trades: ["HANDYMAN"], zips: ["60657"] };
  const job = { status: "OPEN_FOR_BIDS", trade: "HANDYMAN", zipCode: "60657", bidDeadline: bidsCloseAt(now) };

  it("lets a public pro in the right trade and ZIP bid", () => {
    expect(bidBlocker(pro, job, now)).toBeNull();
  });

  it("needs a public page first", () => {
    expect(bidBlocker({ ...pro, published: false }, job, now)).toMatch(/Make your page public/);
  });

  it("refuses closed, wrong-trade and out-of-area projects", () => {
    expect(bidBlocker(pro, { ...job, bidDeadline: new Date("2026-11-17T11:00:00Z") }, now)).toMatch(/closed/);
    expect(bidBlocker(pro, { ...job, status: "AWARDED" }, now)).toMatch(/no longer/);
    expect(bidBlocker(pro, { ...job, trade: "PAINTING" }, now)).toMatch(/outside the work/);
    expect(bidBlocker(pro, { ...job, zipCode: "60614" }, now)).toMatch(/outside the ZIP/);
  });
});

describe("closesLabel", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  it("says when bidding closes, in words", () => {
    expect(closesLabel(bidsCloseAt(now, 3), now)).toBe("Closes in 3 days");
    expect(closesLabel(new Date("2026-11-18T11:00:00Z"), now)).toBe("Closes in 23 hours");
    expect(closesLabel(new Date("2026-11-17T12:30:00Z"), now)).toBe("Closes within the hour");
    expect(closesLabel(new Date("2026-11-17T11:00:00Z"), now)).toBe("Closed");
  });
});
