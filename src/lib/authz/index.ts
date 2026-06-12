import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, validateSessionToken } from "@/lib/auth/session";
import { computeRoles, defaultPortal, type Role } from "./roles";

export type AuthContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  activeRole: Role | null;
  /** Org resolved from MEMBERSHIP - never from client input. */
  activeOrgId: string | null;
  orgs: Array<{ id: string; name: string; role: string }>;
  isSuperAdmin: boolean;
};

/** Request-cached session lookup for server components & route handlers. */
export const getSession = cache(async (): Promise<AuthContext | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await validateSessionToken(token);
  if (!session) return null;

  const { user } = session;
  const roles = computeRoles(user);
  if (roles.length === 0 && !user.isSuperAdmin) return null;

  const orgs = user.memberships.map((m) => ({ id: m.org.id, name: m.org.name, role: m.role }));
  // activeOrgId is only honored if the user actually belongs to that org.
  const activeOrgId =
    session.activeOrgId && orgs.some((o) => o.id === session.activeOrgId)
      ? session.activeOrgId
      : (orgs[0]?.id ?? null);
  const activeRole =
    session.activeRole && roles.includes(session.activeRole as Role)
      ? (session.activeRole as Role)
      : (roles[0] ?? null);

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
    activeRole,
    activeOrgId,
    orgs,
    isSuperAdmin: user.isSuperAdmin,
  };
});

/** Layout guard: requires a logged-in user with the given role. */
export async function requireRole(role: Role, nextPath: string): Promise<AuthContext> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (role === "ADMIN" && !session.isSuperAdmin) redirect(defaultPortal(session.roles));
  if (role !== "ADMIN" && !session.roles.includes(role)) redirect(defaultPortal(session.roles));
  return session;
}

/** Org guard: landlord routes must operate on the session's own org. */
export async function requireOrg(nextPath: string): Promise<AuthContext & { orgId: string }> {
  const session = await requireRole("LANDLORD", nextPath);
  if (!session.activeOrgId) redirect("/login");
  return { ...session, orgId: session.activeOrgId };
}
