import type { Trade } from "@/lib/quotes";
import { formatCents } from "@/lib/money";

/**
 * The jobs pros put prices on (pure). Rental work first: what owners need
 * between tenants and in between. A pro picks the jobs they take and says
 * what each one starts at, so owners see prices before they ask.
 *
 * Keys are stored in ProPrice.taskKey: never rename one, only add.
 */

export type PriceUnit = "job" | "hour" | "room" | "visit";

export type CatalogTask = { key: string; trade: Trade; label: string; unit: PriceUnit };

const t = (trade: Trade, key: string, label: string, unit: PriceUnit = "job"): CatalogTask => ({
  key,
  trade,
  label,
  unit,
});

export const CATALOG: CatalogTask[] = [
  // Maintenance pro: the small fixes rentals need most.
  t("HANDYMAN", "patch-drywall", "Patch drywall"),
  t("HANDYMAN", "fix-door", "Fix or rehang a door"),
  t("HANDYMAN", "fix-cabinets", "Fix cabinet doors and drawers"),
  t("HANDYMAN", "caulk-tub", "Recaulk a tub or shower"),
  t("HANDYMAN", "replace-blinds", "Replace blinds"),
  t("HANDYMAN", "window-screen", "Repair or replace a window screen"),
  t("HANDYMAN", "weatherstrip", "Weatherstrip a door or window"),
  t("HANDYMAN", "mount-tv", "Mount a TV"),
  t("HANDYMAN", "hang-shelves", "Hang shelves, mirrors or pictures"),
  t("HANDYMAN", "assemble-furniture", "Assemble furniture"),
  t("HANDYMAN", "smoke-detectors", "Install battery smoke or CO detectors"),
  t("HANDYMAN", "punch-list", "Turnover punch list", "hour"),

  t("CLEANING", "move-out-clean", "Move-out cleaning"),
  t("CLEANING", "deep-clean-kitchen", "Deep clean a kitchen"),
  t("CLEANING", "carpet-clean", "Carpet cleaning", "room"),
  t("CLEANING", "window-clean", "Window cleaning"),

  t("PAINTING", "paint-room", "Paint a room", "room"),
  t("PAINTING", "paint-unit", "Paint a whole unit"),
  t("PAINTING", "paint-trim", "Paint doors and trim"),
  t("PAINTING", "touch-up", "Touch-up paint between tenants"),

  t("JUNK_REMOVAL", "haul-away", "Haul away what a tenant left"),
  t("JUNK_REMOVAL", "appliance-haul", "Haul away an old appliance"),

  t("LANDSCAPING", "mow", "Mow and edge", "visit"),
  t("LANDSCAPING", "snow", "Snow removal", "visit"),
  t("LANDSCAPING", "leaves", "Leaf cleanup"),
  t("LANDSCAPING", "gutters", "Clean gutters"),

  t("FLOORING", "vinyl-plank", "Install vinyl plank flooring", "room"),
  t("FLOORING", "carpet-replace", "Replace carpet", "room"),

  t("LOCKSMITH", "rekey", "Rekey locks between tenants"),
  t("LOCKSMITH", "lockout", "Lockout"),
  t("LOCKSMITH", "new-deadbolt", "Install a deadbolt"),

  t("APPLIANCE_REPAIR", "appliance-repair", "Repair a fridge, stove, washer or dryer"),
  t("APPLIANCE_REPAIR", "appliance-install", "Install an appliance"),

  t("PEST_CONTROL", "pest-treatment", "Treat for insects"),
  t("PEST_CONTROL", "rodents", "Rodent control"),

  t("PLUMBING", "clear-drain", "Clear a clogged drain"),
  t("PLUMBING", "fix-faucet", "Fix a leaking faucet"),
  t("PLUMBING", "toilet-repair", "Repair a toilet"),
  t("PLUMBING", "water-heater", "Replace a water heater"),

  t("ELECTRICAL", "outlet-switch", "Replace an outlet or switch"),
  t("ELECTRICAL", "light-fixture", "Install a light fixture"),
  t("ELECTRICAL", "hardwired-smoke", "Install hardwired smoke detectors"),

  t("HVAC", "furnace-tune", "Furnace tune-up"),
  t("HVAC", "ac-tune", "Air conditioning tune-up"),
  t("HVAC", "no-heat", "No heat call"),

  t("ROOFING", "roof-leak", "Fix a roof leak"),
  t("GENERAL_CONTRACTOR", "remodel-quote", "Kitchen or bath remodel", "job"),
];

const BY_KEY = new Map(CATALOG.map((c) => [c.key, c]));

export function catalogTask(key: string): CatalogTask | undefined {
  return BY_KEY.get(key);
}

export function tasksForTrades(trades: readonly string[]): CatalogTask[] {
  return CATALOG.filter((c) => trades.includes(c.trade));
}

/**
 * Trades that need a state license almost everywhere. Pros in these list
 * their license number, shown as theirs until a state check exists.
 */
export const LICENSED_TRADES: ReadonlySet<string> = new Set([
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "ROOFING",
  "GENERAL_CONTRACTOR",
]);

export const UNIT_WORD: Record<PriceUnit, string> = {
  job: "",
  hour: "an hour",
  room: "a room",
  visit: "a visit",
};

/** "From $120" or "From $45 an hour". */
export function priceLine(fromCents: number, unit: PriceUnit): string {
  const word = UNIT_WORD[unit];
  return `From ${formatCents(fromCents)}${word ? ` ${word}` : ""}`;
}

/** "Mike's Plumbing & Heating" → "mikes-plumbing-heating". */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "pro"
  );
}

export type PageDraft = {
  emailConfirmed: boolean;
  trades: string[];
  zipCount: number;
  priceCount: number;
  hourlyRateCents: number | null;
};

/** What still stands between a pro and a public page, in plain words. */
export function missingForPublish(d: PageDraft): string[] {
  const missing: string[] = [];
  if (!d.emailConfirmed) missing.push("Confirm your email");
  if (d.trades.length === 0) missing.push("Pick what you do");
  if (d.priceCount === 0 && d.hourlyRateCents == null) missing.push("Add at least one price");
  if (d.zipCount === 0) missing.push("Add the ZIP codes you work in");
  return missing;
}

/** US ZIP codes, typed any which way: "60657, 60614 60613". */
export function parseZips(input: string): string[] {
  const found = input.match(/\b\d{5}\b/g) ?? [];
  return [...new Set(found)].slice(0, 40);
}
