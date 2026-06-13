import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { brand } from "@/lib/brand";
import { hashToken } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { buildInviteLink, INVITE_TTL_DAYS, inviteExpiresAt, isInviteExpired } from "@/lib/invites";
import { sendEmail } from "@/lib/email/send";
import { tenantInviteEmail } from "@/lib/email/templates/tenant-invite";
import { unitTitle } from "@/lib/units";

/**
 * Tenant invitations. The link is the product (always shown, always
 * copyable); email is the bonus channel when Resend is configured. Tokens
 * follow the session pattern: 32 random bytes in the link, sha256 at rest.
 * Re-issuing a link rotates the token - the old link dies with it.
 */

export type InviteEmailStatus = "sent" | "not_configured" | "failed";

function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/** "Unit 2F, 1247 W Oakdale Ave" - or just the address for single units. */
function homeLabel(unitNumber: string, address1: string): string {
  return unitNumber.toLowerCase() === "main"
    ? address1
    : `${unitTitle(unitNumber)}, ${address1}`;
}

async function emailInvite(opts: {
  to: string;
  orgName: string;
  homeLabel: string;
  link: string;
}): Promise<InviteEmailStatus> {
  const { subject, html, text } = tenantInviteEmail({
    brandName: brand.name,
    orgName: opts.orgName,
    homeLabel: opts.homeLabel,
    inviteUrl: opts.link,
    expiresDays: INVITE_TTL_DAYS,
  });
  const result = await sendEmail({ to: opts.to, subject, html, text });
  return result.sent ? "sent" : result.reason === "not_configured" ? "not_configured" : "failed";
}

async function getLeaseForInvite(ctx: OrgCtx, leaseId: string) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: {
      id: true,
      status: true,
      unit: {
        select: {
          unitNumber: true,
          property: {
            select: { address1: true, org: { select: { name: true } } },
          },
        },
      },
      tenants: {
        select: {
          tenantProfile: { select: { user: { select: { email: true } } } },
        },
      },
    },
  });
  if (!lease) throw new NotFoundError("Lease not found.");
  return lease;
}

export async function createTenantInvitation(ctx: OrgCtx, leaseId: string, email: string) {
  const lease = await getLeaseForInvite(ctx, leaseId);
  if (lease.tenants.some((t) => t.tenantProfile.user.email === email)) {
    throw new ConflictError(`${email} is already a tenant on this lease.`);
  }

  const { token, tokenHash } = newToken();
  const expiresAt = inviteExpiresAt();
  const [, invitation] = await prisma.$transaction([
    // Re-inviting the same address replaces its pending invite.
    prisma.invitation.deleteMany({
      where: { leaseId, email, kind: "TENANT", acceptedAt: null },
    }),
    prisma.invitation.create({
      data: {
        kind: "TENANT",
        email,
        tokenHash,
        orgId: ctx.orgId,
        leaseId,
        invitedByUserId: ctx.userId,
        expiresAt,
      },
      select: { id: true, email: true, expiresAt: true, createdAt: true },
    }),
  ]);

  const link = buildInviteLink(env.APP_URL, token);
  const emailStatus = await emailInvite({
    to: email,
    orgName: lease.unit.property.org.name,
    homeLabel: homeLabel(lease.unit.unitNumber, lease.unit.property.address1),
    link,
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "invitation.create",
    entityType: "Invitation",
    entityId: invitation.id,
    meta: { leaseId, email, emailStatus },
  });
  return { invitation, link, emailStatus };
}

/**
 * Re-issue a pending invite: rotate the token (the only way to have a link
 * to show again - we never store the raw token) and re-send the email.
 */
export async function reissueInvitation(ctx: OrgCtx, invitationId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, orgId: ctx.orgId, kind: "TENANT", acceptedAt: null },
  });
  if (!invitation?.leaseId) throw new NotFoundError("Invitation not found.");
  const lease = await getLeaseForInvite(ctx, invitation.leaseId);

  const { token, tokenHash } = newToken();
  const expiresAt = inviteExpiresAt();
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { tokenHash, expiresAt },
  });

  const link = buildInviteLink(env.APP_URL, token);
  const emailStatus = await emailInvite({
    to: invitation.email,
    orgName: lease.unit.property.org.name,
    homeLabel: homeLabel(lease.unit.unitNumber, lease.unit.property.address1),
    link,
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "invitation.reissue",
    entityType: "Invitation",
    entityId: invitation.id,
    meta: { leaseId: invitation.leaseId, email: invitation.email, emailStatus },
  });
  return { link, expiresAt, emailStatus };
}

export async function revokeInvitation(ctx: OrgCtx, invitationId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, orgId: ctx.orgId, acceptedAt: null },
    select: { id: true, email: true, leaseId: true },
  });
  if (!invitation) throw new NotFoundError("Invitation not found.");
  await prisma.invitation.delete({ where: { id: invitation.id } });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "invitation.revoke",
    entityType: "Invitation",
    entityId: invitation.id,
    meta: { leaseId: invitation.leaseId, email: invitation.email },
  });
}

// ── The tenant's side (public, token-keyed) ─────────────────────────────────

export type InvitePreview =
  | { state: "invalid" }
  | { state: "accepted" }
  | { state: "expired"; orgName: string }
  | {
      state: "valid";
      email: string;
      orgName: string;
      unitNumber: string;
      property: {
        address1: string;
        address2: string | null;
        city: string;
        state: string;
        zipCode: string;
        type: string;
        id: string;
        portraitSeed: number | null;
        portraitBody: string | null;
        portraitRoof: string | null;
        portraitAccent: string | null;
        unitStatuses: string[];
      };
      /** Term preview honoring per-field sharing; null when nothing shows. */
      preview: { monthlyRentCents: number | null; startDate: Date | null } | null;
      /** The email already has an account with a password: log in to accept. */
      accountExists: boolean;
    };

async function findInvitationWithLease(rawToken: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!invitation || invitation.kind !== "TENANT" || !invitation.leaseId) return null;
  const lease = await prisma.lease.findFirst({
    where: { id: invitation.leaseId, orgId: invitation.orgId },
    include: {
      unit: {
        include: {
          property: {
            select: {
              id: true,
              address1: true,
              address2: true,
              city: true,
              state: true,
              zipCode: true,
              type: true,
              portraitSeed: true,
              portraitBody: true,
              portraitRoof: true,
              portraitAccent: true,
              org: { select: { name: true } },
              units: { select: { status: true } },
            },
          },
        },
      },
    },
  });
  if (!lease) return null;
  return { invitation, lease };
}

export async function previewInvitation(rawToken: string): Promise<InvitePreview> {
  const found = await findInvitationWithLease(rawToken);
  if (!found) return { state: "invalid" };
  const { invitation, lease } = found;
  if (invitation.acceptedAt) return { state: "accepted" };
  if (isInviteExpired(invitation.expiresAt)) {
    return { state: "expired", orgName: lease.unit.property.org.name };
  }

  const existing = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { passwordHash: true },
  });
  const property = lease.unit.property;
  return {
    state: "valid",
    email: invitation.email,
    orgName: property.org.name,
    unitNumber: lease.unit.unitNumber,
    property: {
      id: property.id,
      address1: property.address1,
      address2: property.address2,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      type: property.type,
      portraitSeed: property.portraitSeed,
      portraitBody: property.portraitBody,
      portraitRoof: property.portraitRoof,
      portraitAccent: property.portraitAccent,
      unitStatuses: property.units.map((u) => u.status),
    },
    preview:
      lease.shareWithTenant &&
      (lease.sharedFields.includes("RENT") || lease.sharedFields.includes("TERM"))
        ? {
            monthlyRentCents: lease.sharedFields.includes("RENT")
              ? lease.monthlyRentCents
              : null,
            startDate: lease.sharedFields.includes("TERM") ? lease.startDate : null,
          }
        : null,
    accountExists: Boolean(existing?.passwordHash),
  };
}

export type AcceptResult = {
  redirect: string;
  /** Set when the accept created a fresh login (cookie to be written). */
  session: { userId: string } | null;
};

/**
 * The whole acceptance in one transaction: claim the invite (double submits
 * lose), create or attach the account, tenant profile + lease link, lease
 * DRAFT to ACTIVE, unit OCCUPIED.
 */
export async function acceptInvitation(
  rawToken: string,
  input: { firstName?: string; lastName?: string; password?: string },
  sessionUser: { id: string; email: string } | null,
): Promise<AcceptResult> {
  const found = await findInvitationWithLease(rawToken);
  if (!found) throw new NotFoundError("This invite link is not valid.");
  const { invitation, lease } = found;
  if (invitation.acceptedAt) {
    throw new ConflictError("This invite was already used. Log in to see your home.");
  }
  if (isInviteExpired(invitation.expiresAt)) {
    throw new ConflictError("This invite has expired. Ask your landlord for a fresh link.");
  }

  const viaSession = sessionUser?.email.toLowerCase() === invitation.email;
  const existing = viaSession
    ? null
    : await prisma.user.findUnique({
        where: { email: invitation.email },
        select: { id: true, passwordHash: true },
      });
  if (existing?.passwordHash) {
    throw new ConflictError(
      "An account with this email already exists. Log in, then open the invite link again.",
    );
  }
  if (!viaSession) {
    if (!input.password) throw new ConflictError("Set a password to finish.");
    if (!existing && (!input.firstName || !input.lastName)) {
      throw new ConflictError("Tell us your name to finish.");
    }
  }
  // argon2 is slow on purpose; hash outside the transaction.
  const passwordHash = !viaSession && input.password ? await hashPassword(input.password) : null;

  const wasDraft = lease.status === "DRAFT";
  const userId = await prisma.$transaction(async (tx) => {
    const claimed = await tx.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new ConflictError("This invite was already used. Log in to see your home.");
    }

    let userId: string;
    if (viaSession) {
      userId = sessionUser!.id;
    } else if (existing) {
      // Account shell without a password (e.g. an earlier unfinished invite).
      await tx.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {}),
        },
      });
      userId = existing.id;
    } else {
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: input.firstName!,
          lastName: input.lastName!,
        },
      });
      userId = user.id;
    }

    const profile = await tx.tenantProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const tenantCount = await tx.leaseTenant.count({ where: { leaseId: lease.id } });
    await tx.leaseTenant.upsert({
      where: { leaseId_tenantProfileId: { leaseId: lease.id, tenantProfileId: profile.id } },
      update: {},
      create: { leaseId: lease.id, tenantProfileId: profile.id, isPrimary: tenantCount === 0 },
    });

    if (wasDraft) {
      await tx.lease.update({ where: { id: lease.id }, data: { status: "ACTIVE" } });
    }
    await tx.unit.update({ where: { id: lease.unitId }, data: { status: "OCCUPIED" } });
    return userId;
  });

  void audit({
    actorUserId: userId,
    orgId: invitation.orgId,
    action: "invitation.accept",
    entityType: "Invitation",
    entityId: invitation.id,
    meta: { leaseId: lease.id, viaSession },
  });
  if (wasDraft) {
    void audit({
      actorUserId: userId,
      orgId: invitation.orgId,
      action: "lease.activate",
      entityType: "Lease",
      entityId: lease.id,
      meta: { trigger: "invite_accepted" },
    });
  }

  return {
    redirect: "/tenant/dashboard",
    session: viaSession ? null : { userId },
  };
}
