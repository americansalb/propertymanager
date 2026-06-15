/**
 * Ledger core (pure). The double-entry running-balance math, kept free of
 * Prisma so it is unit-testable. The service in services/ledger.ts supplies
 * the starting balances it reads inside a SERIALIZABLE transaction.
 *
 * All amounts are signed integer cents (+ credit to the account, - debit).
 * Entries are append-only; a correction is a REVERSAL row, never an update.
 */
import type { LedgerAccountType, LedgerEntryType } from "@prisma/client";

/** One account's movement to append. */
export type LedgerPosting = {
  accountType: LedgerAccountType;
  accountId: string;
  type: LedgerEntryType;
  amountCents: number;
  description: string;
  currency?: string;
  paymentId?: string | null;
  jobId?: string | null;
  milestoneId?: string | null;
  escrowIntentId?: string | null;
  stripeRef?: string | null;
  reversalOfId?: string | null;
};

/** A posting with its computed running balance and resolved currency. */
export type LedgerRow = LedgerPosting & { runningBalanceCents: number; currency: string };

/** Stable grouping key for per-account running balances. */
export function accountKey(accountType: LedgerAccountType, accountId: string): string {
  return `${accountType}:${accountId}`;
}

/**
 * Thread per-account running balances through an ordered list of postings.
 * `starting` holds the latest known balance per accountKey (absent = 0).
 * Postings to the same account compound in order; distinct accounts are
 * independent. Returns one row per posting, in input order.
 */
export function computeRunningBalances(
  starting: Map<string, number>,
  postings: LedgerPosting[],
): LedgerRow[] {
  const balances = new Map(starting);
  const rows: LedgerRow[] = [];
  for (const p of postings) {
    if (!Number.isInteger(p.amountCents)) {
      throw new Error(`amountCents must be an integer, got ${p.amountCents}`);
    }
    const key = accountKey(p.accountType, p.accountId);
    const next = (balances.get(key) ?? 0) + p.amountCents;
    balances.set(key, next);
    rows.push({ ...p, currency: p.currency ?? "usd", runningBalanceCents: next });
  }
  return rows;
}

/** The REVERSAL posting that cancels an existing entry (negated, same account). */
export function reversalPosting(
  entry: {
    id: string;
    accountType: LedgerAccountType;
    accountId: string;
    amountCents: number;
    currency: string;
    paymentId?: string | null;
    jobId?: string | null;
    milestoneId?: string | null;
    escrowIntentId?: string | null;
    stripeRef?: string | null;
  },
  description: string,
): LedgerPosting {
  return {
    accountType: entry.accountType,
    accountId: entry.accountId,
    type: "REVERSAL",
    amountCents: -entry.amountCents,
    description,
    currency: entry.currency,
    paymentId: entry.paymentId ?? null,
    jobId: entry.jobId ?? null,
    milestoneId: entry.milestoneId ?? null,
    escrowIntentId: entry.escrowIntentId ?? null,
    stripeRef: entry.stripeRef ?? null,
    reversalOfId: entry.id,
  };
}
