/**
 * Rent an owner received outside the app: Zelle, cash, a check. Nothing
 * here moves money; it writes down money that already moved, so the
 * balances and the late list tell the truth.
 *
 * Recording pays the oldest charges first (planOfflinePayment). Undoing
 * never deletes: it adds negative allocations and marks the payment voided,
 * so both what happened and the correction stay on record.
 */
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatCents } from "@/lib/money";
import { formatLeaseDate } from "@/lib/leases";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { notify } from "@/lib/services/notification";
import { summarizeBilling, chargeOpenCents, isOverdue, type ChargeView } from "@/lib/charges";
import { PAYMENT_METHODS, planOfflinePayment, statusAfter, type PaymentMethod } from "@/lib/payments";
import type { RecordPaymentInput } from "@/lib/validation/payment";

/** Payments recorded more than this far ahead are mistakes, not prepayments. */
const FUTURE_SLACK_MS = 36 * 60 * 60 * 1000;

export type RentPaymentLine = {
  id: string;
  amountCents: number;
  method: string;
  paidAt: Date | null;
  note: string | null;
  voided: boolean;
  recordedOffline: boolean;
};

export type LeaseRent = {
  leaseId: string;
  balanceCents: number;
  pastDueCents: number;
  nextDueDate: Date | null;
  charges: Array<{ id: string; description: string; openCents: number; dueDate: Date; overdue: boolean }>;
  payments: RentPaymentLine[];
};

async function ownLease(ctx: OrgCtx, leaseId: string) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: {
      id: true,
      orgId: true,
      lateFeeGraceDays: true,
      tenants: {
        orderBy: { isPrimary: "desc" },
        select: { tenantProfile: { select: { user: { select: { id: true, firstName: true } } } } },
      },
    },
  });
  if (!lease) throw new NotFoundError("Lease not found.");
  return lease;
}

export function methodLabel(method: string | null): string {
  return (method && PAYMENT_METHODS[method as PaymentMethod]) ?? "Other";
}

/** Who owes what on a lease, and what has come in. */
export async function getLeaseRent(ctx: OrgCtx, leaseId: string, asOf = new Date()): Promise<LeaseRent> {
  await ownLease(ctx, leaseId);
  const [charges, payments] = await Promise.all([
    prisma.charge.findMany({
      where: { leaseId, status: { not: "VOID" } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { leaseId, orgId: ctx.orgId, status: "SUCCEEDED" },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);
  const summary = summarizeBilling(charges as ChargeView[], asOf);
  return {
    leaseId,
    balanceCents: summary.balanceCents,
    pastDueCents: summary.pastDueCents,
    nextDueDate: summary.nextDueDate,
    charges: charges
      .filter((c) => chargeOpenCents(c) > 0)
      .map((c) => ({
        id: c.id,
        description: c.description,
        openCents: chargeOpenCents(c),
        dueDate: c.dueDate,
        overdue: isOverdue(c as ChargeView, asOf),
      })),
    payments: payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      method: methodLabel(p.method),
      paidAt: p.paidAt,
      note: p.note,
      voided: p.voidedAt != null,
      recordedOffline: p.provider === "OFFLINE",
    })),
  };
}

export async function recordOfflinePayment(ctx: OrgCtx, leaseId: string, input: RecordPaymentInput) {
  const lease = await ownLease(ctx, leaseId);
  const amountCents = Math.round(input.amountDollars * 100);
  const receivedOn = new Date(`${input.receivedOn}T00:00:00Z`);
  if (receivedOn.getTime() > Date.now() + FUTURE_SLACK_MS) {
    throw new ConflictError("That day has not happened yet. Pick the day the money arrived.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const charges = await tx.charge.findMany({
      where: { leaseId, status: { not: "VOID" } },
      orderBy: { dueDate: "asc" },
    });
    const plan = planOfflinePayment({
      amountCents,
      receivedOn,
      graceDays: lease.lateFeeGraceDays,
      charges,
    });
    if (plan.owedCents === 0) {
      throw new ConflictError("Nothing is owed on this lease right now.");
    }
    if (plan.remainderCents > 0) {
      throw new ConflictError(
        `That is more than they owe right now (${formatCents(plan.owedCents)}). Record the rest once the next rent shows up.`,
      );
    }

    const payment = await tx.payment.create({
      data: {
        orgId: lease.orgId,
        leaseId,
        payerUserId: lease.tenants[0]?.tenantProfile.user.id ?? null,
        provider: "OFFLINE",
        method: input.method,
        status: "SUCCEEDED",
        amountCents,
        paidAt: receivedOn,
        note: input.note ?? null,
        recordedByUserId: ctx.userId,
      },
    });
    const byId = new Map(charges.map((c) => [c.id, c]));
    for (const a of plan.allocations) {
      const c = byId.get(a.chargeId)!;
      const paid = c.amountPaidCents + a.amountCents;
      await tx.paymentAllocation.create({
        data: { paymentId: payment.id, chargeId: c.id, amountCents: a.amountCents },
      });
      await tx.charge.update({
        where: { id: c.id },
        data: { amountPaidCents: paid, status: statusAfter(c.amountCents, paid) },
      });
    }
    if (plan.voidChargeIds.length > 0) {
      await tx.charge.updateMany({
        where: { id: { in: plan.voidChargeIds }, amountPaidCents: 0 },
        data: { status: "VOID" },
      });
    }
    return { paymentId: payment.id, waived: plan.voidChargeIds.length };
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "payment.record_offline",
    entityType: "Payment",
    entityId: result.paymentId,
    meta: { amountCents, method: input.method, lateFeesWaived: result.waived },
  });

  const tenant = lease.tenants[0]?.tenantProfile.user;
  if (tenant) {
    await notify({
      userId: tenant.id,
      channel: "IN_APP",
      type: "rent.recorded",
      title: `Payment received: ${formatCents(amountCents)}`,
      body: `Your landlord recorded ${formatCents(amountCents)} by ${methodLabel(input.method)}, received ${formatLeaseDate(receivedOn)}.`,
      linkUrl: "/tenant/payments",
      refType: "Payment",
      refId: result.paymentId,
    });
  }
  return { id: result.paymentId, lateFeesWaived: result.waived };
}

/**
 * Undo a payment written down by mistake. Adds a matching negative row for
 * every allocation and reopens the charges. A late fee wiped by that
 * payment stays wiped: the owner can add a charge if they want it back.
 */
export async function voidOfflinePayment(ctx: OrgCtx, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, orgId: ctx.orgId },
    include: { allocations: true },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (payment.provider !== "OFFLINE") {
    throw new ConflictError("Only payments you recorded yourself can be undone here.");
  }
  if (payment.voidedAt) throw new ConflictError("This payment was already undone.");

  // Net out per charge, in case a charge ever got more than one row.
  const perCharge = new Map<string, number>();
  for (const a of payment.allocations) {
    perCharge.set(a.chargeId, (perCharge.get(a.chargeId) ?? 0) + a.amountCents);
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, voidedAt: null },
      data: { voidedAt: new Date(), voidedByUserId: ctx.userId },
    });
    if (claimed.count === 0) throw new ConflictError("This payment was already undone.");
    for (const [chargeId, net] of perCharge) {
      if (net <= 0) continue;
      await tx.paymentAllocation.create({
        data: { paymentId: payment.id, chargeId, amountCents: -net },
      });
      const c = await tx.charge.findUniqueOrThrow({ where: { id: chargeId } });
      const paid = Math.max(0, c.amountPaidCents - net);
      await tx.charge.update({
        where: { id: chargeId },
        data: {
          amountPaidCents: paid,
          status: c.status === "VOID" ? "VOID" : statusAfter(c.amountCents, paid),
        },
      });
    }
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "payment.void_offline",
    entityType: "Payment",
    entityId: payment.id,
    meta: { amountCents: payment.amountCents },
  });
  return { id: payment.id };
}

/** Payments a tenant can see on their own rent page. */
export async function getTenantPayments(leaseId: string): Promise<RentPaymentLine[]> {
  const rows = await prisma.payment.findMany({
    where: { leaseId, status: "SUCCEEDED", voidedAt: null },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 12,
  });
  return rows.map((p) => ({
    id: p.id,
    amountCents: p.amountCents,
    method: methodLabel(p.method),
    paidAt: p.paidAt,
    note: null, // the owner's note is for the owner
    voided: false,
    recordedOffline: p.provider === "OFFLINE",
  }));
}
