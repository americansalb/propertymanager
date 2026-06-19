import { requireRole } from "@/lib/authz";
import { PortalShell } from "@/components/shells/portal-shell";
import { IconHome, IconMail, IconRent, IconWrench } from "@/components/icons";

const NAV = [
  { href: "/tenant/dashboard", label: "Home", icon: <IconHome className="h-4 w-4" /> },
  { href: "/tenant/payments", label: "Payments", icon: <IconRent className="h-4 w-4" /> },
  { href: "/tenant/maintenance", label: "Maintenance", icon: <IconWrench className="h-4 w-4" /> },
  { href: "/tenant/messages", label: "Messages", icon: <IconMail className="h-4 w-4" /> },
];

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TENANT", "/tenant/dashboard");
  return (
    <PortalShell
      portalLabel="Tenant"
      userName={`${session.firstName} ${session.lastName}`}
      nav={NAV}
    >
      {children}
    </PortalShell>
  );
}
