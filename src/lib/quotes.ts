import { formatCents } from "@/lib/money";

/**
 * Quote rules (pure; the database side lives in services/quote).
 *
 * An owner keeps their own repair people. When a tenant reports a problem,
 * the ones whose trade fits are asked for a price. The owner compares and
 * says yes to one, or sets a limit ahead of time so a price under it is
 * approved without them. No money moves here: "approve" means "go ahead at
 * this price".
 */

export const TRADES = [
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "LOCKSMITH",
  "HANDYMAN",
  "APPLIANCE_REPAIR",
  "PEST_CONTROL",
  "PAINTING",
  "FLOORING",
  "ROOFING",
  "CLEANING",
  "LANDSCAPING",
  "GENERAL_CONTRACTOR",
  "OTHER",
] as const;
export type Trade = (typeof TRADES)[number];

/** What an owner would call the person. */
export const TRADE_LABEL: Record<Trade, string> = {
  PLUMBING: "Plumber",
  ELECTRICAL: "Electrician",
  HVAC: "Heating and cooling",
  LOCKSMITH: "Locksmith",
  HANDYMAN: "Handyman",
  APPLIANCE_REPAIR: "Appliance repair",
  PEST_CONTROL: "Pest control",
  PAINTING: "Painter",
  FLOORING: "Flooring",
  ROOFING: "Roofer",
  CLEANING: "Cleaner",
  LANDSCAPING: "Yard and snow",
  GENERAL_CONTRACTOR: "General contractor",
  OTHER: "Something else",
};

/** The repair categories a tenant picks from (mirrors the MaintCategory enum). */
export type RepairCategory =
  | "PLUMBING"
  | "ELECTRICAL"
  | "HVAC"
  | "APPLIANCE"
  | "DOORS_LOCKS"
  | "PEST"
  | "FLOORING_WALLS"
  | "OTHER";

/** The trades that fit each kind of problem. */
export const TRADES_FOR_CATEGORY: Record<RepairCategory, Trade[]> = {
  PLUMBING: ["PLUMBING"],
  ELECTRICAL: ["ELECTRICAL"],
  HVAC: ["HVAC"],
  APPLIANCE: ["APPLIANCE_REPAIR"],
  DOORS_LOCKS: ["LOCKSMITH"],
  PEST: ["PEST_CONTROL"],
  FLOORING_WALLS: ["FLOORING", "PAINTING"],
  OTHER: [],
};

/** People who can take most small jobs when there is no specialist. */
const GENERALISTS: Trade[] = ["HANDYMAN", "GENERAL_CONTRACTOR"];

/** Asking more than this many people for one repair is noise, not choice. */
export const MAX_ASKED = 5;

export type Askable = { id: string; trades: string[]; archivedAt?: Date | null };

/**
 * Who to ask about a problem: the owner's specialists for that kind of
 * problem. With no specialist on file, their handyman or general contractor.
 */
export function pickContractors<T extends Askable>(category: RepairCategory, people: T[]): T[] {
  const active = people.filter((p) => !p.archivedAt);
  const wanted = TRADES_FOR_CATEGORY[category] ?? [];
  const specialists = active.filter((p) => p.trades.some((t) => wanted.includes(t as Trade)));
  const pool =
    specialists.length > 0
      ? specialists
      : active.filter((p) => p.trades.some((t) => GENERALISTS.includes(t as Trade)));
  return pool.slice(0, MAX_ASKED);
}

/**
 * Does the owner's standing rule say yes to this price? Only when they set
 * a limit for this person, nobody has the job yet, and the most the job
 * could cost (the top of a range) is at or under the limit.
 */
export function ruleApproves(input: {
  limitCents: number | null;
  priceLowCents: number;
  priceHighCents: number | null;
  someoneAlreadyApproved: boolean;
}): boolean {
  if (input.limitCents == null || input.someoneAlreadyApproved) return false;
  const most = input.priceHighCents ?? input.priceLowCents;
  return most <= input.limitCents;
}

/** "$180.00" or "$150.00 to $300.00". */
export function formatQuotePrice(lowCents: number, highCents: number | null): string {
  return highCents != null && highCents > lowCents
    ? `${formatCents(lowCents)} to ${formatCents(highCents)}`
    : formatCents(lowCents);
}

/** The number to sort quotes by: the most the job could cost. */
export function quoteCeilingCents(lowCents: number, highCents: number | null): number {
  return highCents != null && highCents > lowCents ? highCents : lowCents;
}

export function buildQuoteLink(appUrl: string, token: string): string {
  return new URL(`/quote/${token}`, appUrl).toString();
}

/** A phone number as a tel: or sms: target. US numbers without a country code get +1. */
export function phoneHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  const bare = digits.replace(/\D/g, "");
  if (bare.length < 7) return null;
  if (digits.startsWith("+")) return `+${bare}`;
  return bare.length === 10 ? `+1${bare}` : bare.length === 11 && bare.startsWith("1") ? `+${bare}` : bare;
}

/** The text an owner sends from their own phone, with the private link. */
export function quoteTextMessage(input: {
  ownerName: string;
  title: string;
  where: string;
  link: string;
}): string {
  return `Hi, it is ${input.ownerName}. I need a price for a repair: ${input.title}, at ${input.where}. Can you take it? Answer here, no account needed: ${input.link}`;
}
