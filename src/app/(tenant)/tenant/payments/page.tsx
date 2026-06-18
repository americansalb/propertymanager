import { requireRole } from "@/lib/authz";
import { getTenantHome } from "@/lib/services/tenant";
import { getTenantBilling } from "@/lib/services/charges";
import { brand } from "@/lib/brand";
import { formatCents } from "@/lib/money";
import { formatLeaseDate } from "@/lib/leases";
import { Badge, Card, Money, PageTitle } from "@/components/ui";

export const metadata = { title: "Payments" };

export default async function TenantPayments() {
  const session = await requireRole("TENANT", "/tenant/payments");
  const home = await getTenantHome(session.userId);
  const ended = home ? home.leaseStatus === "ENDED" || home.leaseStatus === "TERMINATED" : false;
  const billing = home && !ended ? await getTenantBilling(home.leaseId) : null;

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>Payments</PageTitle>
      <p className="mt-1 text-sm text-stone-500">What you owe and when it&apos;s due.</p>

      {!home ? (
        <Card className="mt-5 p-5 text-sm text-stone-500">Your home isn&apos;t connected yet.</Card>
      ) : !billing ? (
        <Card className="mt-5 p-5 text-sm text-stone-500">No charges on this lease yet.</Card>
      ) : (
        <Card className="mt-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-copper-deep">
              {billing.summary.balanceCents > 0 ? "You owe" : "Balance"}
            </p>
            {billing.summary.pastDueCents > 0 && (
              <Badge tone="red">{formatCents(billing.summary.pastDueCents)} past due</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <Money
              cents={billing.summary.balanceCents}
              className="font-display text-4xl font-semibold text-stone-900"
            />
            {billing.summary.balanceCents === 0 ? (
              <span className="text-sm font-medium text-patina">You&apos;re all paid up</span>
            ) : billing.summary.pastDueCents === 0 && billing.summary.nextDueDate ? (
              <span className="text-sm text-stone-500">
                due {formatLeaseDate(billing.summary.nextDueDate)}
              </span>
            ) : null}
          </div>
          {billing.charges.length > 0 && (
            <ul className="mt-5 space-y-2.5 border-t border-stone-100 pt-4">
              {billing.charges.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-stone-800">{c.description}</p>
                    <p className={c.overdue ? "text-xs text-red-700" : "text-xs text-stone-400"}>
                      {c.overdue ? "Past due " : "Due "}
                      {formatLeaseDate(c.dueDate)}
                    </p>
                  </div>
                  <Money cents={c.openCents} className="shrink-0 font-medium text-stone-900" />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs text-stone-400">
            Paying online through {brand.name} is coming soon. Until then, pay {home.orgName} the way
            you do today.
          </p>
        </Card>
      )}
    </div>
  );
}
