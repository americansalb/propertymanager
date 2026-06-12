import { requireOrg } from "@/lib/authz";
import { PortalShell } from "@/components/shells/portal-shell";
import { IconKeep, IconProperty } from "@/components/icons";

const NAV = [
  {
    href: "/landlord/dashboard",
    label: "Dashboard",
    icon: <IconKeep className="h-4 w-4 text-stone-400" />,
  },
  {
    href: "/landlord/properties",
    label: "Properties",
    icon: <IconProperty className="h-4 w-4 text-stone-400" />,
  },
];

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOrg("/landlord/dashboard");
  const orgName = session.orgs.find((o) => o.id === session.orgId)?.name;
  return (
    <PortalShell
      portalLabel="Landlord"
      userName={`${session.firstName} ${session.lastName}`}
      contextName={orgName}
      nav={NAV}
    >
      {children}
    </PortalShell>
  );
}
