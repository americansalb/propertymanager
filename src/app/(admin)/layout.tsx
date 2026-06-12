import { requireRole } from "@/lib/authz";
import { PortalShell } from "@/components/shells/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN", "/admin/dashboard");
  return (
    <PortalShell portalLabel="Admin" userName={`${session.firstName} ${session.lastName}`}>
      {children}
    </PortalShell>
  );
}
