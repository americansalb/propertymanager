import { requireRole } from "@/lib/authz";
import { listTenantMaintenanceRequests } from "@/lib/services/maintenance";
import { PageTitle } from "@/components/ui";
import { MaintenanceClient } from "@/components/tenant/report-problem-wizard";

export const metadata = { title: "Maintenance" };

export default async function TenantMaintenance() {
  const session = await requireRole("TENANT", "/tenant/maintenance");
  const requests = await listTenantMaintenanceRequests(session.userId);

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>Maintenance</PageTitle>
      <p className="mt-1 text-sm text-stone-500">Report a problem and track repairs.</p>
      <MaintenanceClient requests={requests} />
    </div>
  );
}
