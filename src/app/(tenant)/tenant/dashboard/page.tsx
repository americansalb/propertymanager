import { requireRole } from "@/lib/authz";
import { Card } from "@/components/ui";
import { IconHome, IconRent, IconWrench } from "@/components/icons";

export const metadata = { title: "Home" };

export default async function TenantDashboard() {
  const session = await requireRole("TENANT", "/tenant/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
        Welcome, {session.firstName}
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Your home&apos;s portal. Two things arrive here first:
      </p>
      <div className="mt-5 space-y-3">
        <Card className="flex items-center gap-4 p-4">
          <IconRent className="h-6 w-6 shrink-0 text-copper-deep" duo />
          <div>
            <p className="text-sm font-semibold text-stone-900">Pay rent online</p>
            <p className="text-sm text-stone-500">
              Autopay on the 1st, receipts kept forever. Arriving shortly.
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <IconWrench className="h-6 w-6 shrink-0 text-stone-500" />
          <div>
            <p className="text-sm font-semibold text-stone-900">Report a problem</p>
            <p className="text-sm text-stone-500">
              Snap photos, pick a time, and track the fix without phone tag.
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <IconHome className="h-6 w-6 shrink-0 text-patina" duo />
          <div>
            <p className="text-sm font-semibold text-stone-900">Your lease, in one place</p>
            <p className="text-sm text-stone-500">
              Rent amount, dates, and documents, once your landlord connects them.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
