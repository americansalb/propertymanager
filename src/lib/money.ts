/**
 * Money utilities. All amounts are integer cents; rates are basis points.
 * Fees round half-up to the nearest cent and are clamped to the principal.
 */

export function feeFromBps(amountCents: number, bps: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error(`amountCents must be a non-negative integer, got ${amountCents}`);
  }
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error(`bps must be an integer in [0, 10000], got ${bps}`);
  }
  const fee = Math.round((amountCents * bps) / 10_000);
  return Math.min(fee, amountCents);
}

/** Net amount a pro receives after the marketplace take rate. */
export function netAfterFee(amountCents: number, bps: number): number {
  return amountCents - feeFromBps(amountCents, bps);
}

export function formatCents(amountCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amountCents / 100,
  );
}

/**
 * Allocate a payment across charges oldest-due-first.
 * Returns per-charge allocations plus any unallocated remainder (credit).
 */
export function allocateOldestFirst(
  paymentCents: number,
  charges: Array<{ id: string; dueDate: Date; amountCents: number; amountPaidCents: number }>,
): { allocations: Array<{ chargeId: string; amountCents: number }>; remainderCents: number } {
  let remaining = paymentCents;
  const allocations: Array<{ chargeId: string; amountCents: number }> = [];
  const open = [...charges]
    .filter((c) => c.amountCents - c.amountPaidCents > 0)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  for (const charge of open) {
    if (remaining <= 0) break;
    const due = charge.amountCents - charge.amountPaidCents;
    const applied = Math.min(due, remaining);
    allocations.push({ chargeId: charge.id, amountCents: applied });
    remaining -= applied;
  }
  return { allocations, remainderCents: remaining };
}
