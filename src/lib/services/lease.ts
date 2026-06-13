import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { leaseDefaultsFromUnit } from "@/lib/leases";
import { toLeaseUpdateData, type LeaseUpdateInput } from "@/lib/validation/lease";

// Every query here is scoped by ctx.orgId; cross-org access reads as 404.

/** Statuses that count as "the unit's current lease". */
const CURRENT_STATUSES = ["DRAFT", "ACTIVE"] as const;

/**
 * One click on a vacant unit: a DRAFT lease snapshotting the unit's standing
 * terms. The landlord then edits rows in place and invites the tenant.
 */
export async function createLeaseFromUnit(ctx: OrgCtx, unitId: string) {
  const unit = await prisma.unit.findFirst({ where: { id: unitId, orgId: ctx.orgId } });
  if (!unit) throw new NotFoundError("Unit not found.");

  const existing = await prisma.lease.findFirst({
    where: { unitId, status: { in: [...CURRENT_STATUSES] } },
    select: { id: true },
  });
  if (existing) throw new ConflictError("This unit already has a current lease.");

  const lease = await prisma.lease.create({
    data: { ...leaseDefaultsFromUnit(unit), unitId, orgId: ctx.orgId },
  });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "lease.create",
    entityType: "Lease",
    entityId: lease.id,
    meta: { unitId },
  });
  return lease;
}

export async function updateLease(ctx: OrgCtx, id: string, input: LeaseUpdateInput) {
  const existing = await prisma.lease.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!existing) throw new NotFoundError("Lease not found.");

  const data = toLeaseUpdateData(input);
  // Cross-field check against the merged result, not just the patch.
  const start = (data.startDate as Date | undefined) ?? existing.startDate;
  const end = data.endDate !== undefined ? (data.endDate as Date | null) : existing.endDate;
  if (end && end <= start) {
    throw new ConflictError("The end date must be after the start date.");
  }

  const lease = await prisma.lease.update({ where: { id }, data });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "lease.update",
    entityType: "Lease",
    entityId: id,
    meta: { fields: Object.keys(input) },
  });
  return lease;
}

/** Undo for a misclicked "Start the lease": drafts without people or money. */
export async function deleteLease(ctx: OrgCtx, id: string) {
  const existing = await prisma.lease.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { _count: { select: { tenants: true, charges: true } } },
  });
  if (!existing) throw new NotFoundError("Lease not found.");
  if (existing._count.tenants > 0) {
    throw new ConflictError("This lease has tenants. End it instead of removing it.");
  }
  if (existing._count.charges > 0) {
    throw new ConflictError("This lease has charges on record and can't be removed.");
  }
  await prisma.$transaction([
    prisma.invitation.deleteMany({ where: { leaseId: id } }),
    prisma.lease.delete({ where: { id } }),
  ]);
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "lease.delete",
    entityType: "Lease",
    entityId: id,
    meta: { unitId: existing.unitId },
  });
}

export type UnitTenancySummary = {
  tenantNames: string[];
  pendingInviteEmail: string | null;
};

/** Per-unit tenant lines for a property's unit cards. */
export async function getUnitTenancyByProperty(
  ctx: OrgCtx,
  propertyId: string,
): Promise<Record<string, UnitTenancySummary>> {
  const leases = await prisma.lease.findMany({
    where: { orgId: ctx.orgId, unit: { propertyId }, status: { in: [...CURRENT_STATUSES] } },
    select: {
      id: true,
      unitId: true,
      tenants: {
        orderBy: { isPrimary: "desc" },
        select: {
          tenantProfile: {
            select: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });
  if (leases.length === 0) return {};

  const pending = await prisma.invitation.findMany({
    where: {
      orgId: ctx.orgId,
      leaseId: { in: leases.map((l) => l.id) },
      acceptedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { leaseId: true, email: true },
  });

  const out: Record<string, UnitTenancySummary> = {};
  for (const lease of leases) {
    out[lease.unitId] = {
      tenantNames: lease.tenants.map(
        (t) => `${t.tenantProfile.user.firstName} ${t.tenantProfile.user.lastName}`,
      ),
      pendingInviteEmail: pending.find((p) => p.leaseId === lease.id)?.email ?? null,
    };
  }
  return out;
}

/** Everything the unit page's "Lease & tenant" section renders. */
export async function getUnitLeasePanel(ctx: OrgCtx, unitId: string) {
  const lease = await prisma.lease.findFirst({
    where: { unitId, orgId: ctx.orgId, status: { in: [...CURRENT_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: {
      tenants: {
        orderBy: { isPrimary: "desc" },
        select: {
          id: true,
          isPrimary: true,
          tenantProfile: {
            select: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      },
    },
  });
  if (!lease) return null;

  const invitations = await prisma.invitation.findMany({
    where: { leaseId: lease.id, acceptedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, expiresAt: true, createdAt: true },
  });
  return { lease, invitations };
}
