/**
 * The background tick: one pass of work that cannot happen inside a web
 * request. A Render Cron job pokes the secured endpoint that calls this; it
 * runs in the web service and reuses its Prisma pool, so it adds no new
 * connections to the shared Postgres.
 *
 * Safe to run on overlapping schedules: every unit is claimed atomically, so
 * two ticks never double-process a row and no instance-global lock is needed.
 * Today it flushes pending EMAIL notifications; charge generation, escrow
 * auto-release, and reminders join here as later phases land.
 */
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { notificationEmail, shouldRetryEmail } from "@/lib/notifications";

export type TickSummary = { emailsSent: number; emailsFailed: number };

const DEFAULT_EMAIL_BATCH = 25;

export async function runTick(opts?: { emailBatch?: number }): Promise<TickSummary> {
  return flushPendingEmails(opts?.emailBatch ?? DEFAULT_EMAIL_BATCH);
}

async function flushPendingEmails(limit: number): Promise<TickSummary> {
  const pending = await prisma.notification.findMany({
    where: { channel: "EMAIL", emailedAt: null },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let emailsSent = 0;
  let emailsFailed = 0;
  for (const { id } of pending) {
    // Atomic claim: stamp emailedAt only while still null. count 0 means
    // another tick already owns this one, so skip it.
    const claim = await prisma.notification.updateMany({
      where: { id, emailedAt: null },
      data: { emailedAt: new Date() },
    });
    if (claim.count !== 1) continue;

    const n = await prisma.notification.findUnique({
      where: { id },
      select: { title: true, body: true, linkUrl: true, user: { select: { email: true } } },
    });
    if (!n) continue;

    const result = await sendEmail({ to: n.user.email, ...notificationEmail(n) });
    if (shouldRetryEmail(result)) {
      // Transient failure: release the claim so a later tick retries.
      await prisma.notification.updateMany({ where: { id }, data: { emailedAt: null } });
      emailsFailed++;
    } else {
      emailsSent++;
    }
  }
  return { emailsSent, emailsFailed };
}
