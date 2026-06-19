/**
 * Direct messaging: a thread per lease between the landlord (org members) and
 * the lease's tenant(s). Append-only; each message notifies the other side so
 * the in-app bell surfaces it. Access is checked on every call: you must be a
 * tenant on the lease or a member of its org, else it reads as 404.
 */
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/services/notification";
import { NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { unitTitle } from "@/lib/units";
import type { MessageInput } from "@/lib/validation/message";

async function userNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
}

type LeaseAccess = {
  lease: { id: string; orgId: string; unitNumber: string; propertyName: string; tenantUserIds: string[] };
  isTenant: boolean;
  isLandlord: boolean;
};

async function leaseAccess(userId: string, leaseId: string): Promise<LeaseAccess | null> {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: {
      id: true,
      orgId: true,
      unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      tenants: { select: { tenantProfile: { select: { userId: true } } } },
    },
  });
  if (!lease) return null;
  const tenantUserIds = lease.tenants.map((t) => t.tenantProfile.userId);
  const isTenant = tenantUserIds.includes(userId);
  const membership = await prisma.membership.findFirst({
    where: { userId, orgId: lease.orgId },
    select: { id: true },
  });
  const isLandlord = Boolean(membership);
  if (!isTenant && !isLandlord) return null;
  return {
    lease: {
      id: lease.id,
      orgId: lease.orgId,
      unitNumber: lease.unit.unitNumber,
      propertyName: lease.unit.property.name,
      tenantUserIds,
    },
    isTenant,
    isLandlord,
  };
}

export type ThreadMessage = { id: string; body: string; at: Date; mine: boolean; senderName: string | null };
export type Thread = { leaseId: string; title: string; otherParty: string; messages: ThreadMessage[] };

export async function getThread(userId: string, leaseId: string): Promise<Thread> {
  const access = await leaseAccess(userId, leaseId);
  if (!access) throw new NotFoundError("Conversation not found.");
  const rows = await prisma.message.findMany({
    where: { leaseId },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderUserId: true, body: true, createdAt: true },
  });
  const names = await userNames(rows.map((r) => r.senderUserId));

  let otherParty = "Your landlord";
  if (access.isLandlord && !access.isTenant) {
    const tnames = await userNames(access.lease.tenantUserIds);
    otherParty =
      access.lease.tenantUserIds.map((id) => tnames.get(id)).filter(Boolean).join(", ") || "Tenant";
  }

  return {
    leaseId,
    title: `${unitTitle(access.lease.unitNumber)} · ${access.lease.propertyName}`,
    otherParty,
    messages: rows.map((r) => ({
      id: r.id,
      body: r.body,
      at: r.createdAt,
      mine: r.senderUserId === userId,
      senderName: names.get(r.senderUserId) ?? null,
    })),
  };
}

export async function sendMessage(userId: string, input: MessageInput) {
  const access = await leaseAccess(userId, input.leaseId);
  if (!access) throw new NotFoundError("Conversation not found.");
  const body = input.body.trim();
  const message = await prisma.message.create({
    data: { leaseId: input.leaseId, orgId: access.lease.orgId, senderUserId: userId, body },
  });

  const sender = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  const senderName = `${sender.firstName} ${sender.lastName}`;
  const snippet = body.length > 140 ? `${body.slice(0, 140)}…` : body;

  if (access.isTenant) {
    const members = await prisma.membership.findMany({
      where: { orgId: access.lease.orgId, role: { in: ["OWNER", "MANAGER"] } },
      select: { userId: true },
    });
    for (const m of members) {
      if (m.userId === userId) continue;
      await notify({
        userId: m.userId,
        channel: "IN_APP",
        type: "message",
        title: `New message from ${senderName}`,
        body: snippet,
        linkUrl: `/landlord/messages/${input.leaseId}`,
        refType: "Lease",
        refId: input.leaseId,
      });
    }
  } else {
    for (const uid of access.lease.tenantUserIds) {
      if (uid === userId) continue;
      await notify({
        userId: uid,
        channel: "IN_APP",
        type: "message",
        title: `New message from ${senderName}`,
        body: snippet,
        linkUrl: `/tenant/messages`,
        refType: "Lease",
        refId: input.leaseId,
      });
    }
  }

  void audit({
    actorUserId: userId,
    orgId: access.lease.orgId,
    action: "message.send",
    entityType: "Message",
    entityId: message.id,
    meta: { leaseId: input.leaseId },
  });
  return { id: message.id, body: message.body, at: message.createdAt };
}

export type LandlordThreadRow = {
  leaseId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  tenantName: string | null;
  lastBody: string | null;
  lastAt: Date | null;
  lastFromTenant: boolean;
};

/** Current leases that have a tenant, with a last-message preview, recent first. */
export async function listLandlordThreads(ctx: OrgCtx): Promise<LandlordThreadRow[]> {
  const leases = await prisma.lease.findMany({
    where: { orgId: ctx.orgId, status: { in: ["DRAFT", "ACTIVE"] }, tenants: { some: {} } },
    select: {
      id: true,
      unit: { select: { unitNumber: true, propertyId: true, property: { select: { name: true } } } },
      tenants: {
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: {
          tenantProfile: {
            select: { userId: true, user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderUserId: true },
      },
    },
  });

  const rows: LandlordThreadRow[] = leases.map((l) => {
    const t = l.tenants[0]?.tenantProfile;
    const last = l.messages[0] ?? null;
    return {
      leaseId: l.id,
      unitNumber: l.unit.unitNumber,
      propertyId: l.unit.propertyId,
      propertyName: l.unit.property.name,
      tenantName: t ? `${t.user.firstName} ${t.user.lastName}` : null,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt ?? null,
      lastFromTenant: last ? last.senderUserId === (t?.userId ?? "") : false,
    };
  });
  return rows.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
}

/** The signed-in tenant's thread (active lease preferred, else most recent). */
export async function getTenantThread(userId: string): Promise<Thread | null> {
  const profile = await prisma.tenantProfile.findUnique({
    where: { userId },
    select: {
      leaseTenants: {
        select: { lease: { select: { id: true, status: true, startDate: true, createdAt: true } } },
      },
    },
  });
  const leases = profile?.leaseTenants.map((lt) => lt.lease) ?? [];
  if (leases.length === 0) return null;
  const chosen =
    leases
      .filter((l) => l.status === "ACTIVE")
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0] ??
    leases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]!;
  return getThread(userId, chosen.id);
}
