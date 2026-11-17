/**
 * Password reset, fully self-serve. A one-time link goes to the account's
 * email: 32 random bytes in the link, only the sha256 at rest, one hour to
 * use it. Asking never reveals whether an email has an account. Setting the
 * new password signs out every other device and signs this one in.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { brand } from "@/lib/brand";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { createSession, hashToken, revokeAllUserSessions } from "@/lib/auth/session";
import { computeRoles, defaultPortal } from "@/lib/authz/roles";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { AuthError } from "@/lib/services/auth";

export const RESET_MINUTES = 60;

export function buildResetLink(appUrl: string, token: string): string {
  return new URL(`/reset/${token}`, appUrl).toString();
}

/** Always resolves the same way, whether or not the email has an account. */
export async function requestPasswordReset(email: string, ip: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, email: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return;

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    // Only the newest link works: older unused ones die.
    prisma.authToken.updateMany({
      where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: now },
    }),
    prisma.authToken.create({
      data: {
        userId: user.id,
        purpose: "PASSWORD_RESET",
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + RESET_MINUTES * 60_000),
      },
    }),
  ]);

  const link = buildResetLink(env.APP_URL, token);
  const mail = passwordResetEmail({
    brandName: brand.name,
    firstName: user.firstName,
    link,
    minutes: RESET_MINUTES,
  });
  const result = await sendEmail({ to: user.email, ...mail });
  if (!result.sent && env.NODE_ENV !== "production") {
    // Local development has no mail service: print the link instead.
    console.log(`[password reset link for ${user.email}] ${link}`);
  }
  void audit({
    actorUserId: user.id,
    action: "user.password_reset_requested",
    entityType: "User",
    entityId: user.id,
    ip,
    meta: { emailed: result.sent },
  });
}

async function findUsable(rawToken: string) {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!row || row.purpose !== "PASSWORD_RESET") return null;
  if (row.usedAt || row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

/** Whether a reset link can still be used, and whose it is (first name only). */
export async function previewReset(rawToken: string): Promise<{ ok: false } | { ok: true; firstName: string }> {
  const row = await findUsable(rawToken);
  if (!row) return { ok: false };
  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { firstName: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return { ok: false };
  return { ok: true, firstName: user.firstName };
}

export async function resetPassword(
  rawToken: string,
  password: string,
  meta: { ip: string; userAgent: string | null },
) {
  const row = await findUsable(rawToken);
  if (!row) throw new AuthError("This link no longer works. Ask for a new one.", 410);

  const passwordHash = await hashPassword(password);
  const now = new Date();
  // Use the token first, so the same link can never set two passwords.
  const claimed = await prisma.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count === 0) throw new AuthError("This link no longer works. Ask for a new one.", 410);

  const user = await prisma.user.update({
    where: { id: row.userId },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    include: {
      memberships: { select: { orgId: true } },
      tenantProfile: { select: { id: true } },
      proProfile: { select: { id: true } },
    },
  });
  // Opening the link proves they read this inbox.
  if (!user.emailVerifiedAt) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
  }
  await revokeAllUserSessions(user.id);

  void audit({
    actorUserId: user.id,
    action: "user.password_reset",
    entityType: "User",
    entityId: user.id,
    ip: meta.ip,
  });

  const roles = computeRoles(user);
  if (roles.length === 0) return { token: null, expiresAt: null, redirect: "/login" };
  const activeOrgId = user.memberships[0]?.orgId ?? null;
  const { token, expiresAt } = await createSession({
    userId: user.id,
    activeRole: roles[0],
    activeOrgId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { token, expiresAt, redirect: defaultPortal(roles) };
}
