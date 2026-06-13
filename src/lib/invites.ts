/**
 * Invite link mechanics (pure; the DB side lives in services/invite).
 * Tokens follow the session pattern: random 32 bytes in the link, only the
 * sha256 at rest. Rotating the token is how a link is re-issued.
 */

export const INVITE_TTL_DAYS = 7;

export function inviteExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function buildInviteLink(appUrl: string, token: string): string {
  return new URL(`/invite/${token}`, appUrl).toString();
}

/** Whole days remaining, ceiling: a link sent today says "7 days". */
export function inviteDaysLeft(expiresAt: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000));
}

export function isInviteExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
