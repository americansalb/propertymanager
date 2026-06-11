import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/authz";

export const metadata = { title: "Dashboard" };

export default async function LandlordDashboard() {
  const { orgId, firstName } = await requireOrg("/landlord/dashboard");

  const [properties, units, openMaintenance] = await Promise.all([
    prisma.property.count({ where: { orgId } }),
    prisma.unit.count({ where: { orgId } }),
    prisma.maintenanceRequest.count({
      where: { orgId, status: { in: ["SUBMITTED", "ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS"] } },
    }),
  ]);

  const stats = [
    { label: "Properties", value: properties },
    { label: "Units", value: units },
    { label: "Open maintenance", value: openMaintenance },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Welcome, {firstName}</h1>
      <p className="mt-1 text-sm text-stone-500">Here&apos;s your portfolio at a glance.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold text-stone-900">{s.value}</p>
          </div>
        ))}
      </div>

      {properties === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <h2 className="text-lg font-medium text-stone-900">Add your first property</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Properties, units, and tenant invitations arrive in the next milestone — the
            foundation you&apos;re standing on is ready for them.
          </p>
          <span className="mt-4 inline-block cursor-not-allowed rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-500">
            Add property — coming next
          </span>
        </div>
      )}
    </div>
  );
}
