/**
 * Email confirmation: the free check every pro passes before their page can
 * go public. Same token pattern as password reset, 24 hours to use it.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { brand } from "@/lib/brand";
import { audit } from "@/lib/audit";
import { hashToken } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { confirmEmail } from "@/lib/email/templates/confirm-email";

const HOURS = 24;

export async function sendEmailConfirmation(userId: string): Promise<{ sent: boolean; already: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, emailVerifiedAt: true },
  });
  if (!user) return { sent: false, already: false };
  if (user.emailVerifiedAt) return { sent: false, already: true };

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId, purpose: "EMAIL_VERIFY", usedAt: null },
      data: { usedAt: now },
    }),
    prisma.authToken.create({
      data: {
        userId,
        purpose: "EMAIL_VERIFY",
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + HOURS * 3_600_000),
      },
    }),
  ]);
  const link = new URL(`/verify/${token}`, env.APP_URL).toString();
  const result = await sendEmail({
    to: user.email,
    ...confirmEmail({ brandName: brand.name, firstName: user.firstName, link }),
  });
  if (!result.sent && env.NODE_ENV !== "production") {
    console.log(`[email confirm link for ${user.email}] ${link}`);
  }
  return { sent: result.sent, already: false };
}

export async function confirmEmailToken(rawToken: string): Promise<{ ok: boolean; firstName?: string }> {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!row || row.purpose !== "EMAIL_VERIFY") return { ok: false };
  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { id: true, firstName: true, emailVerifiedAt: true },
  });
  if (!user) return { ok: false };
  // Opening it twice is fine once it worked the first time.
  if (user.emailVerifiedAt && row.usedAt) return { ok: true, firstName: user.firstName };
  if (row.usedAt || row.expiresAt.getTime() <= Date.now()) return { ok: false };
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
  ]);
  void audit({ actorUserId: user.id, action: "user.email_confirmed", entityType: "User", entityId: user.id });
  return { ok: true, firstName: user.firstName };
}
