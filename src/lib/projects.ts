import type { RepairCategory, Trade } from "@/lib/quotes";

/**
 * Projects open to nearby pros (pure). An owner posts a job; pros whose
 * trade fits and who work in that ZIP code bid with a price and a time; the
 * owner picks one. No money moves through VillageKeep.
 *
 * Only work that needs no state license in most places goes out to people
 * the owner does not know. Plumbing, electrical, heating and cooling, roofs
 * and pest treatment stay with the owner's own people.
 */

export const OPEN_TRADES = [
  "HANDYMAN",
  "CLEANING",
  "PAINTING",
  "JUNK_REMOVAL",
  "LANDSCAPING",
  "FLOORING",
  "APPLIANCE_REPAIR",
] as const satisfies readonly Trade[];
export type OpenTrade = (typeof OPEN_TRADES)[number];

/** What to call the people in each open trade, in a sentence. */
export const OPEN_TRADE_PEOPLE: Record<OpenTrade, string> = {
  HANDYMAN: "maintenance pros",
  CLEANING: "cleaners",
  PAINTING: "painters",
  JUNK_REMOVAL: "junk haulers",
  LANDSCAPING: "yard and snow pros",
  FLOORING: "flooring pros",
  APPLIANCE_REPAIR: "appliance repair pros",
};

export function isOpenTrade(t: string): t is OpenTrade {
  return (OPEN_TRADES as readonly string[]).includes(t);
}

/** Which nearby pros a tenant's repair can go out to, if any. */
export function openTradeForCategory(category: RepairCategory): OpenTrade | null {
  switch (category) {
    case "APPLIANCE":
      return "APPLIANCE_REPAIR";
    case "DOORS_LOCKS": // a sticking door; new locks stay with the owner's locksmith
    case "FLOORING_WALLS":
    case "OTHER":
      return "HANDYMAN";
    default:
      return null; // licensed work: the owner's own people only
  }
}

/** How long a project takes bids, unless the owner says otherwise. */
export const DEFAULT_BID_DAYS = 3;

export function bidsCloseAt(from: Date, days = DEFAULT_BID_DAYS): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

export type ProForBidding = {
  published: boolean;
  trades: readonly string[];
  zips: readonly string[];
};

export type ProjectForBidding = {
  status: string;
  trade: string;
  zipCode: string;
  bidDeadline: Date | null;
};

/** Why a pro cannot bid, in plain words, or null when they can. */
export function bidBlocker(pro: ProForBidding, job: ProjectForBidding, now = new Date()): string | null {
  if (!pro.published) return "Make your page public to bid. Owners look at it before they say yes.";
  if (job.status !== "OPEN_FOR_BIDS") return "This project is no longer taking bids.";
  if (job.bidDeadline && job.bidDeadline.getTime() <= now.getTime()) {
    return "Bids for this project have closed.";
  }
  if (!pro.trades.includes(job.trade)) return "This project is outside the work you listed.";
  if (!pro.zips.includes(job.zipCode)) return "This project is outside the ZIP codes you work in.";
  return null;
}

/** "Closes in 2 days", "Closes today", "Closed". */
export function closesLabel(deadline: Date | null, now = new Date()): string {
  if (!deadline) return "Open until the owner picks";
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return "Closed";
  const hours = Math.ceil(ms / 3_600_000);
  if (hours < 24) return hours <= 1 ? "Closes within the hour" : `Closes in ${hours} hours`;
  const days = Math.ceil(hours / 24);
  return days === 1 ? "Closes tomorrow" : `Closes in ${days} days`;
}
