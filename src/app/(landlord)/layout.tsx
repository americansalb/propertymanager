import { requireOrg } from "@/lib/authz";
import { PortalShell } from "@/components/shells/portal-shell";

const NAV = [
  { href: "/landlord/dashboard", label: "Dashboard" },
  { href: "/landlord/properties", label: "Properties" },
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
