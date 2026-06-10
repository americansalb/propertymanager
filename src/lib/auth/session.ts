import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SLIDING_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // extend when <15 days left

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(opts: {
  userId: string;
  activeRole?: string | null;
  activeOrgId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      userId: opts.userId,
      tokenHash: hashToken(token),
      activeRole: opts.activeRole ?? null,
      activeOrgId: opts.activeOrgId ?? null,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

/** Validates a raw token; applies sliding expiry. Returns null when invalid. */
export async function validateSessionToken(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: { include: { org: true } },
          tenantProfile: { select: { id: true } },
          proProfile: { select: { id: true, status: true } },
        },
      },
    },
  });
  if (!session) return null;
  if (session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;

  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < SLIDING_THRESHOLD_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS), lastSeenAt: new Date() },
    });
  }
  return session;
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
