export type Role = "LANDLORD" | "TENANT" | "PRO" | "ADMIN";

/**
 * Roles are derived from data, never stored as a column - one human can hold
 * any combination (the old app's single-role flaw, fixed).
 */
export function computeRoles(user: {
  isSuperAdmin: boolean;
  memberships: Array<unknown>;
  tenantProfile: unknown | null;
  proProfile: unknown | null;
}): Role[] {
  const roles: Role[] = [];
  if (user.memberships.length > 0) roles.push("LANDLORD");
  if (user.tenantProfile) roles.push("TENANT");
  if (user.proProfile) roles.push("PRO");
  if (user.isSuperAdmin) roles.push("ADMIN");
  return roles;
}

/** Where a user lands by default, in priority order. */
export function defaultPortal(roles: Role[], activeRole?: string | null): string {
  const role = activeRole && roles.includes(activeRole as Role) ? (activeRole as Role) : roles[0];
  switch (role) {
    case "LANDLORD":
      return "/landlord/dashboard";
    case "PRO":
      return "/pro/dashboard";
    case "TENANT":
      return "/tenant/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}
