/**
 * Maintenance service (tenant side): a tenant files a request against their
 * active lease, it lands as SUBMITTED with a status-history row, and the
 * landlord is notified. Landlord-side triage and the marketplace bridge come
 * later; this is the tenant's "report a problem" path.
 */
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/services/notification";
import { NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { unitTitle } from "@/lib/units";
import {
  CATEGORY_LABEL,
  MAINT_STATUS_LABEL,
  type MaintenanceRequestInput,
  type MaintenanceRespondInput,
} from "@/lib/validation/maintenance";

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
  updates: Array<{
    id: string;
    status: string;
    note: string | null;
    at: Date;
    fromLandlord: boolean;
    changed: boolean;
  }>;
};

export async function listTenantMaintenanceRequests(userId: string): Promise<TenantRequestRow[]> {
  const lease = await tenantActiveLease(userId);
  if (!lease) return [];
  const reqs = await prisma.maintenanceRequest.findMany({
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
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true, actorUserId: true },
      },
    },
  });
  return reqs.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    description: r.description,
    urgency: r.urgency,
    status: r.status,
    createdAt: r.createdAt,
    updates: r.statusHistory.map((h) => ({
      id: h.id,
      status: h.toStatus,
      note: h.note,
      at: h.createdAt,
      fromLandlord: h.actorUserId !== userId,
      changed: h.fromStatus !== h.toStatus,
    })),
  }));
}

// ── Landlord side: inbox, detail, respond ───────────────────────────────────

const OPEN_MAINT_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS"] as const;
const URGENCY_RANK: Record<string, number> = { EMERGENCY: 0, URGENT: 1, NORMAL: 2, LOW: 3 };

/** Resolve a set of userIds to "First Last" display names. */
async function userNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
}

export type OrgMaintenanceRow = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  open: boolean;
  createdAt: Date;
  unitNumber: string | null;
  propertyId: string;
  propertyName: string;
  tenantName: string | null;
};

/** Every maintenance request across the org, open ones first, for the inbox. */
export async function listOrgMaintenance(ctx: OrgCtx): Promise<OrgMaintenanceRow[]> {
  const reqs = await prisma.maintenanceRequest.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      urgency: true,
      status: true,
      createdAt: true,
      createdByUserId: true,
      property: { select: { id: true, name: true } },
      unit: { select: { unitNumber: true } },
    },
  });
  const names = await userNames(reqs.map((r) => r.createdByUserId));
  const rows: OrgMaintenanceRow[] = reqs.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    urgency: r.urgency,
    status: r.status,
    open: (OPEN_MAINT_STATUSES as readonly string[]).includes(r.status),
    createdAt: r.createdAt,
    unitNumber: r.unit?.unitNumber ?? null,
    propertyId: r.property.id,
    propertyName: r.property.name,
    tenantName: names.get(r.createdByUserId) ?? null,
  }));
  return rows.sort(
    (a, b) =>
      Number(b.open) - Number(a.open) ||
      (URGENCY_RANK[a.urgency] ?? 9) - (URGENCY_RANK[b.urgency] ?? 9) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export type MaintenanceTimelineEntry = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  at: Date;
  actorName: string | null;
  byMe: boolean;
};

export type OrgMaintenanceDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  createdAt: Date;
  permissionToEnter: boolean;
  accessNotes: string | null;
  preferredTimes: string[];
  unitNumber: string | null;
  propertyId: string;
  propertyName: string;
  reporterName: string | null;
  timeline: MaintenanceTimelineEntry[];
};

/** One request with its full timeline, org-scoped (cross-org reads as 404). */
export async function getOrgMaintenanceRequest(
  ctx: OrgCtx,
  id: string,
): Promise<OrgMaintenanceDetail> {
  const req = await prisma.maintenanceRequest.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      property: { select: { id: true, name: true } },
      unit: { select: { unitNumber: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!req) throw new NotFoundError("Request not found.");
  const names = await userNames([
    req.createdByUserId,
    ...req.statusHistory.map((h) => h.actorUserId),
  ]);
  return {
    id: req.id,
    title: req.title,
    description: req.description,
    category: req.category,
    urgency: req.urgency,
    status: req.status,
    createdAt: req.createdAt,
    permissionToEnter: req.permissionToEnter,
    accessNotes: req.accessNotes,
    preferredTimes: req.preferredTimes,
    unitNumber: req.unit?.unitNumber ?? null,
    propertyId: req.property.id,
    propertyName: req.property.name,
    reporterName: names.get(req.createdByUserId) ?? null,
    timeline: req.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      at: h.createdAt,
      actorName: names.get(h.actorUserId) ?? null,
      byMe: h.actorUserId === ctx.userId,
    })),
  };
}

/** Landlord responds: optional status change and/or a note; the tenant is notified. */
export async function respondToMaintenance(
  ctx: OrgCtx,
  id: string,
  input: MaintenanceRespondInput,
): Promise<{ id: string; status: string }> {
  const req = await prisma.maintenanceRequest.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true, status: true, title: true, createdByUserId: true },
  });
  if (!req) throw new NotFoundError("Request not found.");

  const note = input.note?.trim() || null;
  const nextStatus = input.toStatus ?? req.status;
  const changed = input.toStatus !== undefined && input.toStatus !== req.status;

  await prisma.$transaction(async (tx) => {
    if (changed) {
      await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: input.toStatus!,
          ...(input.toStatus === "RESOLVED"
            ? { resolvedAt: new Date(), ...(note ? { resolutionNotes: note } : {}) }
            : {}),
        },
      });
    }
    await tx.maintenanceStatusHistory.create({
      data: {
        requestId: id,
        fromStatus: req.status,
        toStatus: nextStatus,
        actorUserId: ctx.userId,
        note,
      },
    });
  });

  const statusLabel = MAINT_STATUS_LABEL[nextStatus] ?? nextStatus;
  await notify({
    userId: req.createdByUserId,
    channel: "IN_APP",
    type: "maintenance.update",
    title: changed ? `Update: ${req.title}` : `Note on: ${req.title}`,
    body: note ?? `Your landlord marked this ${statusLabel.toLowerCase()}.`,
    linkUrl: "/tenant/maintenance",
    refType: "MaintenanceRequest",
    refId: id,
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "maintenance.respond",
    entityType: "MaintenanceRequest",
    entityId: id,
    meta: { toStatus: input.toStatus ?? null, note: Boolean(note) },
  });

  return { id, status: nextStatus };
}
