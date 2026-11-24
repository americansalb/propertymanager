import { requireRole } from "@/lib/authz";
import { getTenantSpots } from "@/lib/services/maintenance";
import { BackLink } from "@/components/ui";
import { EmergencyFlow } from "@/components/tenant/emergency-flow";

export const metadata = { title: "Emergency" };

export default async function TenantEmergency() {
  const session = await requireRole("TENANT", "/tenant/emergency");
  const spots = await getTenantSpots(session.userId);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/tenant/dashboard">Home</BackLink>
      <div className="mt-2">
        <EmergencyFlow spots={spots} />
      </div>
    </div>
  );
}
