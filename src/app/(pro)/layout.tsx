import { requireRole } from "@/lib/authz";
import { PortalShell } from "@/components/shells/portal-shell";

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PRO", "/pro/dashboard");
  return (
    <PortalShell portalLabel="Pro" userName={`${session.firstName} ${session.lastName}`}>
      {children}
    </PortalShell>
  );
}
