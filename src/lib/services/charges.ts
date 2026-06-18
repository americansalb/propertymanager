/**
 * Charges service: generate recurring rent and late fees (idempotently, run by
 * the worker tick), read a tenant's balance, and surface a landlord's late
 * rent. The money math lives in the pure core (src/lib/charges.ts).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  rentChargeForPeriod,
  lateFeeForRent,
  summarizeBilling,
  chargeOpenCents,
  isOverdue,
  daysLate,
  type LeaseForBilling,
  type ChargeView,
  type ChargeSpec,
} from "@/lib/charges";

const UNIQUE_VIOLATION = "P2002";

const LEASE_BILLING_SELECT = {
  id: true,
  orgId: true,
  status: true,
  startDate: true,
  endDate: true,
  monthlyRentCents: true,
  rentDueDay: true,
  lateFeeCents: true,
  lateFeeGraceDays: true,
} as const;

async function createChargeIfNew(args: {
  leaseId: string;
  orgId: string;
  type: "RENT" | "LATE_FEE";
  spec: ChargeSpec;
}): Promise<boolean> {
  // Check first so the common "already generated this period" path on every
  // tick does not log a unique-violation; the catch stays as a race backstop.
  const existing = await prisma.charge.findFirst({
    where: { leaseId: args.leaseId, type: args.type, periodKey: args.spec.periodKey },
    select: { id: true },
  });
  if (existing) return false;
  try {
    await prisma.charge.create({
      data: {
        leaseId: args.leaseId,
        orgId: args.orgId,
        type: args.type,
        periodKey: args.spec.periodKey,
        amountCents: args.spec.amountCents,
        description: args.spec.description,
        dueDate: args.spec.dueDate,
      },
    });
    return true;
  } catch (e) {
    // The (leaseId, type, periodKey) unique means the charge already exists.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === UNIQUE_VIOLATION) return false;
    throw e;
  }
}

/** Generate the current-month RENT charge for every active lease. Idempotent. */
export async function generateRentCharges(asOf: Date = new Date()): Promise<number> {
  const leases = await prisma.lease.findMany({
    where: { status: "ACTIVE" },
    select: LEASE_BILLING_SELECT,
  });
  let created = 0;
  for (const lease of leases) {
    const spec = rentChargeForPeriod(lease as LeaseForBilling, asOf);
    if (!spec) continue;
    if (await createChargeIfNew({ leaseId: lease.id, orgId: lease.orgId, type: "RENT", spec })) {
      created++;
    }
  }
  return created;
}

/** Add a LATE_FEE for each still-open overdue RENT charge past its grace. Idempotent. */
export async function applyLateFees(asOf: Date = new Date()): Promise<number> {
  const rents = await prisma.charge.findMany({
    where: { type: "RENT", status: { not: "VOID" }, dueDate: { lt: asOf } },
    select: {
      leaseId: true,
      orgId: true,
      periodKey: true,
      status: true,
      amountCents: true,
      amountPaidCents: true,
      dueDate: true,
      lease: { select: { lateFeeCents: true, lateFeeGraceDays: true } },
    },
  });
  let created = 0;
  for (const rent of rents) {
    const fee = lateFeeForRent(rent as ChargeView, rent.lease, asOf);
    if (!fee) continue;
    if (await createChargeIfNew({ leaseId: rent.leaseId, orgId: rent.orgId, type: "LATE_FEE", spec: fee })) {
      created++;
    }
  }
  return created;
}

export type TenantBilling = {
  summary: ReturnType<typeof summarizeBilling>;
  charges: Array<{
    id: string;
    type: string;
    description: string;
    openCents: number;
    dueDate: Date;
    overdue: boolean;
  }>;
};

/**
 * A tenant's open charges for the portal. leaseId comes from the authed
 * tenant's own home, so it is already theirs.
 */
export async function getTenantBilling(leaseId: string, asOf: Date = new Date()): Promise<TenantBilling> {
  const rows = await prisma.charge.findMany({
    where: { leaseId, status: { not: "VOID" } },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      description: true,
      amountCents: true,
      amountPaidCents: true,
      dueDate: true,
      periodKey: true,
    },
  });
  const summary = summarizeBilling(rows as ChargeView[], asOf);
  const charges = rows
    .filter((c) => chargeOpenCents(c) > 0)
    .map((c) => ({
      id: c.id,
      type: c.type,
      description: c.description,
      openCents: chargeOpenCents(c),
      dueDate: c.dueDate,
      overdue: isOverdue(c as ChargeView, asOf),
    }));
  return { summary, charges };
}

export type OrgLateRent = {
  leaseId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  tenantName: string | null;
  openCents: number;
  daysLate: number;
  dueDate: Date;
};

/** Overdue rent across an org, aggregated per lease, for the dashboard queue. */
export async function getOrgLateRent(orgId: string, asOf: Date = new Date()): Promise<OrgLateRent[]> {
  const rents = await prisma.charge.findMany({
    where: { orgId, type: "RENT", status: { in: ["PENDING", "PARTIALLY_PAID"] }, dueDate: { lt: asOf } },
    select: {
      leaseId: true,
      amountCents: true,
      amountPaidCents: true,
      dueDate: true,
      lease: {
        select: {
          unit: { select: { unitNumber: true, propertyId: true, property: { select: { name: true } } } },
          tenants: {
            orderBy: { isPrimary: "desc" },
            take: 1,
            select: { tenantProfile: { select: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      },
    },
  });

  const byLease = new Map<string, OrgLateRent>();
  for (const r of rents) {
    const open = Math.max(0, r.amountCents - r.amountPaidCents);
    if (open <= 0) continue;
    const u = r.lease.unit;
    const user = r.lease.tenants[0]?.tenantProfile.user ?? null;
    const existing = byLease.get(r.leaseId);
    if (existing) {
      existing.openCents += open;
      if (r.dueDate < existing.dueDate) {
        existing.dueDate = r.dueDate;
        existing.daysLate = daysLate(r.dueDate, asOf);
      }
    } else {
      byLease.set(r.leaseId, {
        leaseId: r.leaseId,
        unitNumber: u.unitNumber,
        propertyId: u.propertyId,
        propertyName: u.property.name,
        tenantName: user ? `${user.firstName} ${user.lastName}` : null,
        openCents: open,
        daysLate: daysLate(r.dueDate, asOf),
        dueDate: r.dueDate,
      });
    }
  }
  return [...byLease.values()];
}
