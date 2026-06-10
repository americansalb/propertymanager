import { prisma } from "@/lib/db";

/** Append-only audit trail. Failures never break the user action. */
export async function audit(entry: {
  actorUserId?: string | null;
  orgId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        orgId: entry.orgId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        meta: (entry.meta ?? undefined) as object | undefined,
      },
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }
}
