import { requireRole } from "@/lib/authz";
import { PortalShell } from "@/components/shells/portal-shell";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TENANT", "/tenant/dashboard");
  return (
    <PortalShell portalLabel="Tenant" userName={`${session.firstName} ${session.lastName}`}>
      {children}
    </PortalShell>
  );
}
