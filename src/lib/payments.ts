import { allocateOldestFirst } from "@/lib/money";

/**
 * Rent received outside the app (pure). An owner writes down a payment they
 * got by Zelle, cash or check; it pays the oldest charges first. A late fee
 * is wiped when the payment shows the rent arrived on time after all, so
 * an owner who records a few days late never charges a tenant who paid.
 */

export const PAYMENT_METHODS = {
  zelle: "Zelle",
  cash: "Cash",
  check: "Check",
  money_order: "Money order",
  bank_transfer: "Bank transfer",
  other: "Other",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export type ChargeForPlan = {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  amountPaidCents: number;
  dueDate: Date;
  periodKey: string | null;
};

const DAY = 86_400_000;

function dayStartUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function openOf(c: Pick<ChargeForPlan, "status" | "amountCents" | "amountPaidCents">): number {
  return c.status === "VOID" ? 0 : Math.max(0, c.amountCents - c.amountPaidCents);
}

/** Received on or before the last day of the grace period. */
export function arrivedOnTime(dueDate: Date, graceDays: number, receivedOn: Date): boolean {
  return dayStartUTC(receivedOn) <= dayStartUTC(dueDate) + Math.max(0, graceDays) * DAY;
}

export type PaymentPlan = {
  allocations: Array<{ chargeId: string; amountCents: number }>;
  /** Late fees to wipe because the rent they were for arrived on time. */
  voidChargeIds: string[];
  /** Money left over after every open charge is paid: more than they owe. */
  remainderCents: number;
  /** What they owed once those fees are wiped. */
  owedCents: number;
};

export function planOfflinePayment(input: {
  amountCents: number;
  receivedOn: Date;
  graceDays: number;
  charges: ChargeForPlan[];
}): PaymentPlan {
  const open = input.charges.filter((c) => openOf(c) > 0);
  const rentByPeriod = new Map(
    open.filter((c) => c.type === "RENT" && c.periodKey).map((c) => [c.periodKey!, c]),
  );

  // Fees that only exist because nobody had written the rent down yet.
  const waivable = open.filter((c) => {
    if (c.type !== "LATE_FEE" || c.amountPaidCents > 0 || !c.periodKey) return false;
    const rent = rentByPeriod.get(c.periodKey);
    return rent != null && arrivedOnTime(rent.dueDate, input.graceDays, input.receivedOn);
  });
  const waivableIds = new Set(waivable.map((c) => c.id));

  // Pay everything else first, oldest first.
  const first = allocateOldestFirst(
    input.amountCents,
    open.filter((c) => !waivableIds.has(c.id)),
  );
  const paidNow = new Map(first.allocations.map((a) => [a.chargeId, a.amountCents]));

  // A fee is wiped only when this payment clears the rent it was for.
  const voidChargeIds = waivable
    .filter((fee) => {
      const rent = rentByPeriod.get(fee.periodKey!)!;
      return openOf(rent) - (paidNow.get(rent.id) ?? 0) <= 0;
    })
    .map((fee) => fee.id);
  const voided = new Set(voidChargeIds);

  // Rent paid late in part keeps its fee; money left over goes to it.
  const second = allocateOldestFirst(
    first.remainderCents,
    waivable.filter((c) => !voided.has(c.id)),
  );

  const owedCents = open
    .filter((c) => !voided.has(c.id))
    .reduce((sum, c) => sum + openOf(c), 0);

  return {
    allocations: [...first.allocations, ...second.allocations],
    voidChargeIds,
    remainderCents: second.remainderCents,
    owedCents,
  };
}

/** A charge's status after its paid amount changes. */
export function statusAfter(amountCents: number, amountPaidCents: number): "PENDING" | "PARTIALLY_PAID" | "PAID" {
  if (amountPaidCents <= 0) return "PENDING";
  return amountPaidCents >= amountCents ? "PAID" : "PARTIALLY_PAID";
}
