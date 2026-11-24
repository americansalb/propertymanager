import type { RepairCategory } from "@/lib/quotes";

/**
 * Emergency rules (pure; the database side lives in services/maintenance,
 * services/quote and services/spots).
 *
 * An emergency is handled in three moves. The tenant is told what to do
 * right now, with a photo of the shutoff. The owner's own repair people who
 * fit are asked to come, and the first one to say yes at or under the
 * owner's emergency limit gets the job. The owner reads what happened
 * afterwards. No money moves: approving is "go ahead at this price".
 */

// ── Where things are ────────────────────────────────────────────────────────

/** The places someone has to find in a hurry. One photo each. */
export const SPOTS = ["WATER", "BREAKER", "GAS", "FURNACE"] as const;
export type Spot = (typeof SPOTS)[number];

export const SPOT_LABEL: Record<Spot, string> = {
  WATER: "Water shutoff",
  BREAKER: "Breaker panel",
  GAS: "Gas shutoff",
  FURNACE: "Furnace or boiler",
};

/** A spot's photo is an Attachment on the property with this kind. */
export function spotKind(spot: Spot): string {
  return `SPOT_${spot}`;
}

export function spotFromKind(kind: string): Spot | null {
  const s = kind.startsWith("SPOT_") ? kind.slice(5) : "";
  return (SPOTS as readonly string[]).includes(s) ? (s as Spot) : null;
}

export function isSpot(v: unknown): v is Spot {
  return typeof v === "string" && (SPOTS as readonly string[]).includes(v);
}

/** What a tenant or a repair person may see about one spot. */
export type SpotView = {
  spot: Spot;
  label: string;
  /** The owner's words: "Basement, by the meter". */
  where: string | null;
  photoUrl: string | null;
};

/** Only the spots the owner has said something about. */
export function knownSpots(spots: SpotView[]): SpotView[] {
  return spots.filter((s) => s.where != null || s.photoUrl != null);
}

// ── What is happening ───────────────────────────────────────────────────────

export const EMERGENCY_KINDS = ["WATER", "POWER", "HEAT", "GAS", "DOOR", "OTHER"] as const;
export type EmergencyKind = (typeof EMERGENCY_KINDS)[number];

export type EmergencyPlan = {
  /** What the tenant taps. */
  label: string;
  hint: string;
  /** The repair it becomes. */
  category: RepairCategory;
  title: string;
  /** The place they need to find, if there is one. */
  spot: Spot | null;
  /** What to do before anyone arrives, in order. */
  steps: string[];
  /** False when the right call is 911 or the utility, not the owner's people. */
  askPeople: boolean;
};

export const EMERGENCY: Record<EmergencyKind, EmergencyPlan> = {
  WATER: {
    label: "Water is leaking or flooding",
    hint: "A burst pipe, an overflowing toilet, water through the ceiling",
    category: "PLUMBING",
    title: "Water leak",
    spot: "WATER",
    steps: [
      "Turn off the water at the main shutoff.",
      "Keep away from water that is near outlets or cords.",
      "Move what you can out of the water.",
    ],
    askPeople: true,
  },
  POWER: {
    label: "The power is out, or something is sparking",
    hint: "No electricity, a sparking outlet, a burning smell",
    category: "ELECTRICAL",
    title: "Electrical problem",
    spot: "BREAKER",
    steps: [
      "If you see sparks or smoke, or smell burning, leave and call 911.",
      "If it is safe, look at the breaker panel. A tripped switch sits in the middle: push it fully off, then on.",
      "Unplug whatever was running when the power went.",
    ],
    askPeople: true,
  },
  HEAT: {
    label: "There is no heat",
    hint: "The furnace or boiler stopped and it is cold",
    category: "HVAC",
    title: "No heat",
    spot: "FURNACE",
    steps: [
      "Check that the thermostat is set to heat, and set above the room temperature.",
      "Check the furnace switch. It looks like a light switch near the furnace and should be on.",
      "Keep windows and doors closed. Never heat a home with the oven.",
    ],
    askPeople: true,
  },
  GAS: {
    label: "I smell gas",
    hint: "A rotten egg smell, or a hissing sound near a gas line",
    category: "OTHER",
    title: "Gas smell",
    spot: null,
    steps: [
      "Leave the home now and leave the door open behind you.",
      "Do not touch light switches, the stove, or anything with a flame.",
      "From outside, call 911 and your gas company.",
    ],
    askPeople: false,
  },
  DOOR: {
    label: "A door or window will not lock",
    hint: "A broken lock, a door that will not close, a broken window",
    category: "DOORS_LOCKS",
    title: "Home will not lock",
    spot: null,
    steps: [
      "If someone broke in, go somewhere safe and call 911.",
      "If you can, block the door or window from the inside.",
    ],
    askPeople: true,
  },
  OTHER: {
    label: "Something else that cannot wait",
    hint: "Anything that could hurt someone or damage the home",
    category: "OTHER",
    title: "Emergency",
    spot: null,
    steps: ["Stay clear of anything that looks unsafe."],
    askPeople: true,
  },
};

/** Said above every emergency, whatever the kind. */
export const DANGER_LINE = "If anyone is in danger, call 911 first.";

export function isEmergencyKind(v: unknown): v is EmergencyKind {
  return typeof v === "string" && (EMERGENCY_KINDS as readonly string[]).includes(v);
}

// ── Who may say yes ─────────────────────────────────────────────────────────

/**
 * The most a price may be for the owner's rule to approve it. On an
 * ordinary repair that is the limit set for the person. In an emergency
 * the owner's emergency limit also counts, and the higher of the two wins:
 * an emergency never makes someone harder to approve.
 */
export function approvalLimitCents(input: {
  personLimitCents: number | null;
  emergencyLimitCents: number | null;
  emergency: boolean;
}): number | null {
  if (!input.emergency || input.emergencyLimitCents == null) return input.personLimitCents;
  return Math.max(input.personLimitCents ?? 0, input.emergencyLimitCents);
}

/** "Mike", "Mike and Ana", "Mike, Ana and Lee". */
export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * One line for the owner about who was asked. People who could not be
 * emailed (only a phone number on file, or the email failed) are named,
 * because nobody reaches them until the owner does.
 * `skipped` says why nobody was asked at all, when that was on purpose.
 */
export function askedSummary(input: {
  asked: Array<{ name: string; emailed: boolean }>;
  emergency: boolean;
  skipped?: "OFF" | "NOT_THEIR_JOB" | null;
}): string {
  const { asked, emergency } = input;
  if (input.skipped === "NOT_THEIR_JOB") {
    return " Nobody on your list was asked: this one is for 911 and the gas company.";
  }
  if (input.skipped === "OFF") {
    return emergency ? " Asking automatically is off, so nobody has been asked yet." : "";
  }
  if (asked.length === 0) {
    return emergency ? " Nobody on your list fits this, so nobody has been asked yet." : "";
  }
  const reached = asked.filter((a) => a.emailed).map((a) => a.name);
  const unreached = asked.filter((a) => !a.emailed).map((a) => a.name);
  const what = emergency ? "to come" : "for a price";
  const parts: string[] = [];
  if (reached.length > 0) parts.push(` We asked ${nameList(reached)} ${what}.`);
  if (unreached.length > 0) {
    parts.push(
      ` ${nameList(unreached)} could not be emailed: text or call them yourself.`,
    );
  }
  return parts.join("");
}
