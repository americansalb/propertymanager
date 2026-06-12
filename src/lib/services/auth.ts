import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { computeRoles, defaultPortal } from "@/lib/authz/roles";
import { createOrgWithOwner } from "@/lib/services/org";
import { audit } from "@/lib/audit";
import type { LoginInput, SignupInput } from "@/lib/validation/auth";

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

// Constant-time-ish dummy verify target to blunt user-enumeration timing.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function signup(input: SignupInput, meta: { ip: string; userAgent: string | null }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AuthError("An account with this email already exists.", 409);

  const passwordHash = await hashPassword(input.password);

  const { user, orgId } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
      },
    });
    let orgId: string | null = null;
    if (input.accountType === "LANDLORD") {
      const org = await createOrgWithOwner(tx, { name: input.businessName, ownerUserId: user.id });
      orgId = org.id;
    } else {
      await tx.proProfile.create({
        data: {
          userId: user.id,
          businessName: input.businessName,
          phone: input.phone ?? "",
          status: "DRAFT",
        },
      });
    }
    return { user, orgId };
  });

  const { token, expiresAt } = await createSession({
    userId: user.id,
    activeRole: input.accountType,
    activeOrgId: orgId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  void audit({
    actorUserId: user.id,
    orgId,
    action: "user.signup",
    entityType: "User",
    entityId: user.id,
    ip: meta.ip,
    meta: { accountType: input.accountType },
  });

  const redirect = input.accountType === "LANDLORD" ? "/landlord/dashboard" : "/pro/dashboard";
  return { token, expiresAt, redirect };
}

export async function login(input: LoginInput, meta: { ip: string; userAgent: string | null }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      memberships: { select: { orgId: true } },
      tenantProfile: { select: { id: true } },
      proProfile: { select: { id: true } },
    },
  });

  if (!user || !user.passwordHash) {
    await verifyPassword(DUMMY_HASH, input.password); // equalize timing
    throw new AuthError("Invalid email or password.", 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AuthError("Account temporarily locked. Try again in a few minutes.", 403);
  }
  if (user.status !== "ACTIVE") {
    throw new AuthError("This account is not active.", 403);
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const failed = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failed,
        lockedUntil: failed >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });
    void audit({
      actorUserId: user.id,
      action: failed >= MAX_FAILED_ATTEMPTS ? "user.login_locked" : "user.login_failed",
      entityType: "User",
      entityId: user.id,
      ip: meta.ip,
    });
    throw new AuthError("Invalid email or password.", 401);
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const roles = computeRoles(user);
  if (roles.length === 0) throw new AuthError("This account has no active workspace.", 403);

  const activeOrgId = user.memberships[0]?.orgId ?? null;
  const { token, expiresAt } = await createSession({
    userId: user.id,
    activeRole: roles[0],
    activeOrgId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  void audit({
    actorUserId: user.id,
    orgId: activeOrgId,
    action: "user.login",
    entityType: "User",
    entityId: user.id,
    ip: meta.ip,
  });

  return { token, expiresAt, redirect: defaultPortal(roles) };
}
