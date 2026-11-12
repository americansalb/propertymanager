import { requireRole } from "@/lib/authz";
import { listTenantMaintenanceRequests } from "@/lib/services/maintenance";
import { MaintenanceClient } from "@/components/tenant/report-problem-wizard";

export const metadata = { title: "Repairs" };

export default async function TenantMaintenance() {
  const session = await requireRole("TENANT", "/tenant/maintenance");
  const requests = await listTenantMaintenanceRequests(session.userId);

  return (
    <div className="mx-auto max-w-3xl">
      <MaintenanceClient requests={requests} />
    </div>
  );
}
