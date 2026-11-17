import { requireRole } from "@/lib/authz";
import { PortalShell } from "@/components/shells/portal-shell";
import { IconKeep, IconWrench } from "@/components/icons";

const NAV = [
  { href: "/pro/dashboard", label: "Your page", icon: <IconKeep className="h-4 w-4" /> },
  { href: "/pro/projects", label: "Projects", icon: <IconWrench className="h-4 w-4" /> },
];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PRO", "/pro/dashboard");
  return (
    <PortalShell portalLabel="Pro" userName={`${session.firstName} ${session.lastName}`} nav={NAV}>
      {children}
    </PortalShell>
  );
}
