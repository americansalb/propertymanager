import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/authz";

export const metadata = { title: "Admin" };

export default async function AdminDashboard() {
  await requireRole("ADMIN", "/admin/dashboard");

  const [users, orgs, pros] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.proProfile.count(),
  ]);

  const stats = [
    { label: "Users", value: users },
    { label: "Organizations", value: orgs },
    { label: "Pro profiles", value: pros },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Platform overview</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold text-stone-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
