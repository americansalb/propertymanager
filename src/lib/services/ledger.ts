/**
 * Ledger service: the single path for money movement. Appends LedgerEntry
 * rows with correct per-account running balances, atomically and idempotently.
 * Append-only by design; corrections go through reverseEntry, never updates.
 *
 * Rent collection and marketplace escrow both post through here, so the money
 * math lives in exactly one place (see src/lib/ledger.ts for the pure core).
 */
import { Prisma } from "@prisma/client";
import type { LedgerAccountType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/authz/api";
import { accountKey, computeRunningBalances, reversalPosting, type LedgerPosting } from "@/lib/ledger";

export type PostLedgerArgs = {
  postings: LedgerPosting[];
  /** Retry/replay guard: the same key posts at most once (e.g. a webhook id). */
  idempotencyKey?: string;
  scope?: string;
};

export type PostLedgerResult =
  | { posted: true; entries: Prisma.LedgerEntryGetPayload<object>[] }
  | { posted: false; entries: [] };

const SERIALIZATION_FAILURE = "P2034"; // write conflict or deadlock; safe to retry
const UNIQUE_VIOLATION = "P2002";

async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === SERIALIZATION_FAILURE) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

/**
 * Append one or more ledger entries in a single SERIALIZABLE transaction.
 * Running balances are read (latest per account, by seq) and written together,
 * so concurrent posts to the same account serialize rather than race.
 */
export async function postLedger(args: PostLedgerArgs): Promise<PostLedgerResult> {
  const { postings, idempotencyKey, scope = "ledger" } = args;
  if (postings.length === 0) return { posted: false, entries: [] };

  try {
    return await withRetry(() =>
      prisma.$transaction(
        async (tx) => {
          if (idempotencyKey) {
            // Common case (webhook redelivery is sequential): check first so a
            // replay is a clean no-op, not a logged unique-violation. The outer
            // catch still covers the rare concurrent first-time collision.
            const seen = await tx.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
            if (seen) return { posted: false as const, entries: [] };
            await tx.idempotencyKey.create({ data: { key: idempotencyKey, scope } });
          }

          // Latest running balance per distinct account, inside the tx.
          const accounts = new Map<string, { accountType: LedgerAccountType; accountId: string }>();
          for (const p of postings) {
            accounts.set(accountKey(p.accountType, p.accountId), p);
          }
          const starting = new Map<string, number>();
          for (const [key, { accountType, accountId }] of accounts) {
            const last = await tx.ledgerEntry.findFirst({
              where: { accountType, accountId },
              orderBy: { seq: "desc" },
              select: { runningBalanceCents: true },
            });
            starting.set(key, last?.runningBalanceCents ?? 0);
          }

          const rows = computeRunningBalances(starting, postings);
          const entries: Prisma.LedgerEntryGetPayload<object>[] = [];
          for (const r of rows) {
            entries.push(
              await tx.ledgerEntry.create({
                data: {
                  accountType: r.accountType,
                  accountId: r.accountId,
                  type: r.type,
                  amountCents: r.amountCents,
                  runningBalanceCents: r.runningBalanceCents,
                  currency: r.currency,
                  description: r.description,
                  paymentId: r.paymentId ?? null,
                  jobId: r.jobId ?? null,
                  milestoneId: r.milestoneId ?? null,
                  escrowIntentId: r.escrowIntentId ?? null,
                  stripeRef: r.stripeRef ?? null,
                  reversalOfId: r.reversalOfId ?? null,
                },
              }),
            );
          }
          return { posted: true as const, entries };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  } catch (e) {
    // A duplicate idempotency key means this post already happened: no-op.
    if (
      idempotencyKey &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === UNIQUE_VIOLATION
    ) {
      return { posted: false, entries: [] };
    }
    throw e;
  }
}

/** Append the REVERSAL row that cancels an entry. One reversal per entry. */
export async function reverseEntry(entryId: string, description: string): Promise<PostLedgerResult> {
  const entry = await prisma.ledgerEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new NotFoundError("Ledger entry not found.");
  if (entry.reversalOfId) throw new ConflictError("Cannot reverse a reversal entry.");
  const already = await prisma.ledgerEntry.findUnique({ where: { reversalOfId: entryId } });
  if (already) throw new ConflictError("This entry has already been reversed.");

  return postLedger({
    postings: [reversalPosting(entry, description)],
    idempotencyKey: `reverse:${entryId}`,
    scope: "ledger.reverse",
  });
}

/** Current balance for one account (0 when it has no entries yet). */
export async function accountBalanceCents(
  accountType: LedgerAccountType,
  accountId: string,
): Promise<number> {
  const last = await prisma.ledgerEntry.findFirst({
    where: { accountType, accountId },
    orderBy: { seq: "desc" },
    select: { runningBalanceCents: true },
  });
  return last?.runningBalanceCents ?? 0;
}
