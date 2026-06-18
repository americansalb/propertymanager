import { formatCents } from "@/lib/money";

/**
 * The attention engine (pure logic, no DB).
 *
 * The dashboard is one engine from first login to the thousandth: a
 * prioritized queue of "things needing the landlord". Day 0 renders setup
 * gaps; year 3 renders operations exceptions. Each milestone adds item
 * builders here; the surface never changes shape.
 */

export type AttentionClass =
  | "EMERGENCY"
  | "MONEY_ON_YOU" // money waiting on the landlord (release escrow, compare bids)
  | "MONEY_TO_YOU" // money owed to the landlord (late rent)
  | "EXPIRING" // leases, credentials
  | "OPTIMIZATION" // vacancy, pricing
  | "SETUP"; // onboarding gaps, housekeeping

export const CLASS_ORDER: Record<AttentionClass, number> = {
  EMERGENCY: 0,
  MONEY_ON_YOU: 1,
  MONEY_TO_YOU: 2,
  EXPIRING: 3,
  OPTIMIZATION: 4,
  SETUP: 5,
};

export type AttentionItem = {
  id: string;
  kind: "vacancy" | "sample" | "late-rent";
  cls: AttentionClass;
  title: string;
  meta?: string;
  /** Dollars at stake, used for ordering within a class. */
  stakeCents?: number;
  action: { label: string; href: string };
  /** Optional entity reference (e.g. propertyId) for kind-specific UI. */
  refId?: string;
};

/** Class first, then biggest dollars, then stable by id. */
export function sortAttention(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort(
    (a, b) =>
      CLASS_ORDER[a.cls] - CLASS_ORDER[b.cls] ||
      (b.stakeCents ?? 0) - (a.stakeCents ?? 0) ||
      a.id.localeCompare(b.id),
  );
}

export type VacantUnitInput = {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  marketRentCents: number | null;
};

export function buildVacancyItems(vacant: VacantUnitInput[]): AttentionItem[] {
  return vacant.map((u) => ({
    id: `vacancy:${u.unitId}`,
    kind: "vacancy" as const,
    cls: "OPTIMIZATION" as const,
    title: `${u.unitNumber} at ${u.propertyName} is vacant`,
    meta:
      u.marketRentCents != null
        ? `${formatCents(u.marketRentCents)}/mo sitting idle`
        : "No market rent set",
    stakeCents: u.marketRentCents ?? 0,
    action: { label: "View unit", href: `/landlord/properties/${u.propertyId}` },
    refId: u.propertyId,
  }));
}

export type LateRentInput = {
  leaseId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  tenantName: string | null;
  openCents: number;
  daysLate: number;
};

/** Overdue rent: the "money owed to you" cards on the dashboard. */
export function buildLateRentItems(late: LateRentInput[]): AttentionItem[] {
  return late.map((l) => ({
    id: `late-rent:${l.leaseId}`,
    kind: "late-rent" as const,
    cls: "MONEY_TO_YOU" as const,
    title: l.tenantName
      ? `${l.tenantName} · ${l.unitNumber} at ${l.propertyName}`
      : `${l.unitNumber} at ${l.propertyName}`,
    meta: `${formatCents(l.openCents)} · ${l.daysLate} day${l.daysLate === 1 ? "" : "s"} late`,
    stakeCents: l.openCents,
    action: { label: "View", href: `/landlord/properties/${l.propertyId}` },
    refId: l.propertyId,
  }));
}

export function buildSampleItem(sample: { id: string; name: string }): AttentionItem {
  return {
    id: `sample:${sample.id}`,
    kind: "sample",
    cls: "SETUP",
    title: "You're exploring with sample data",
    meta: "Remove it whenever you're ready; your real properties are untouched.",
    action: { label: "Open sample", href: `/landlord/properties/${sample.id}` },
    refId: sample.id,
  };
}

// ── Setup chain (the day-0 instance of attention) ──────────────────────────

export type SetupStep = {
  key: "property" | "rents" | "invite" | "bank";
  label: string;
  done: boolean;
  /** Built in a later milestone; shown greyed with a "soon" tag. */
  soon?: boolean;
  href?: string;
};

export type SetupState = { steps: SetupStep[]; complete: boolean };

export function computeSetup(input: {
  propertyCount: number;
  unitsWithRent: number;
  /** TENANT invitations ever sent (accepted ones included). */
  tenantInvites: number;
  /** Tenants actually linked to a lease. */
  tenantsJoined: number;
}): SetupState {
  const steps: SetupStep[] = [
    {
      key: "property",
      label: "Add your first property",
      done: input.propertyCount > 0,
      href: "/landlord/properties/new",
    },
    {
      key: "rents",
      label: "Set unit rents",
      done: input.unitsWithRent > 0,
      href: "/landlord/properties",
    },
    {
      key: "invite",
      label: "Invite your tenant",
      done: input.tenantInvites > 0 || input.tenantsJoined > 0,
      href: "/landlord/properties",
    },
    { key: "bank", label: "Connect your bank", done: false, soon: true },
  ];
  // Complete = everything buildable today is done; "soon" steps re-open the
  // chain when their milestones ship.
  const complete = steps.filter((s) => !s.soon).every((s) => s.done);
  return { steps, complete };
}
