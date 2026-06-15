/**
 * Notification service: record notifications and read a user's feed. IN_APP
 * rows render in the feed immediately; EMAIL rows are delivered by the worker
 * tick (src/lib/worker/tick.ts). The single producer API for every capability.
 */
import { prisma } from "@/lib/db";
import type { NotificationChannel } from "@prisma/client";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  channel?: NotificationChannel; // default IN_APP
  refType?: string | null;
  refId?: string | null;
};

/** Record a notification. */
export async function notify(input: NotifyInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? null,
      channel: input.channel ?? "IN_APP",
      refType: input.refType ?? null,
      refId: input.refId ?? null,
    },
  });
}

/** Recent notifications for a user's feed (newest first). */
export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      linkUrl: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/**
 * Mark a user's notifications read. With ids, only those (still scoped to the
 * user so nobody can touch another's); without ids, all of their unread.
 */
export async function markRead(userId: string, ids?: string[]): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return res.count;
}
