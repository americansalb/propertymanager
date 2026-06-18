/**
 * Maintenance service (tenant side): a tenant files a request against their
 * active lease, it lands as SUBMITTED with a status-history row, and the
 * landlord is notified. Landlord-side triage and the marketplace bridge come
 * later; this is the tenant's "report a problem" path.
 */
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/services/notification";
import { NotFoundError } from "@/lib/authz/api";
import { unitTitle } from "@/lib/units";
import { CATEGORY_LABEL, type MaintenanceRequestInput } from "@/lib/validation/maintenance";

/** The lease a tenant's requests attach to (active preferred, else most recent). */
async function tenantActiveLease(userId: string) {
  const profile = await prisma.tenantProfile.findUnique({
    where: { userId },
    select: {
      leaseTenants: {
        select: {
          lease: {
            select: {
              id: true,
              orgId: true,
              status: true,
              startDate: true,
              createdAt: true,
              unit: { select: { id: true, unitNumber: true, propertyId: true } },
            },
          },
        },
      },
    },
  });
  const leases = profile?.leaseTenants.map((lt) => lt.lease) ?? [];
  if (leases.length === 0) return null;
  return (
    leases
      .filter((l) => l.status === "ACTIVE")
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0] ??
    leases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]!
  );
}

export async function createTenantMaintenanceRequest(userId: string, input: MaintenanceRequestInput) {
  const lease = await tenantActiveLease(userId);
  if (!lease) throw new NotFoundError("No active lease to attach this to.");
  const tenant = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });

  const request = await prisma.maintenanceRequest.create({
    data: {
      orgId: lease.orgId,
      propertyId: lease.unit.propertyId,
      unitId: lease.unit.id,
      leaseId: lease.id,
      createdByUserId: userId,
      origin: "TENANT",
      category: input.category,
      title: input.title,
      description: input.description,
      urgency: input.urgency,
      permissionToEnter: input.permissionToEnter,
      accessNotes: input.accessNotes ?? null,
      preferredTimes: input.preferredTimes ?? [],
      status: "SUBMITTED",
    },
  });
  await prisma.maintenanceStatusHistory.create({
    data: { requestId: request.id, toStatus: "SUBMITTED", actorUserId: userId },
  });
  void audit({
    actorUserId: userId,
    orgId: lease.orgId,
    action: "maintenance.create",
    entityType: "MaintenanceRequest",
    entityId: request.id,
    meta: { category: input.category, urgency: input.urgency },
  });

  // Alert the landlord(s). Email is flushed by the worker tick.
  const members = await prisma.membership.findMany({
    where: { orgId: lease.orgId, role: { in: ["OWNER", "MANAGER"] } },
    select: { userId: true },
  });
  const who = `${tenant.firstName} ${tenant.lastName}`;
  for (const m of members) {
    await notify({
      userId: m.userId,
      channel: "EMAIL",
      type: "maintenance.submitted",
      title: `${input.urgency === "EMERGENCY" ? "EMERGENCY: " : ""}New maintenance request`,
      body: `${who} reported a ${CATEGORY_LABEL[input.category]} issue at ${unitTitle(lease.unit.unitNumber)}: ${input.title}`,
      linkUrl: `/landlord/properties/${lease.unit.propertyId}`,
      refType: "MaintenanceRequest",
      refId: request.id,
    });
  }
  return { id: request.id };
}

export type TenantRequestRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  createdAt: Date;
};

export async function listTenantMaintenanceRequests(userId: string): Promise<TenantRequestRow[]> {
  const lease = await tenantActiveLease(userId);
  if (!lease) return [];
  return prisma.maintenanceRequest.findMany({
    where: { leaseId: lease.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      urgency: true,
      status: true,
      createdAt: true,
    },
  });
}
