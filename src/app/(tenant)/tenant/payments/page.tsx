import { requireRole } from "@/lib/authz";
import { getTenantHome } from "@/lib/services/tenant";
import { getTenantBilling } from "@/lib/services/charges";
import { formatCents } from "@/lib/money";
import { formatLeaseDate } from "@/lib/leases";
import { Section } from "@/components/ui";

export const metadata = { title: "Rent" };

export default async function TenantPayments() {
  const session = await requireRole("TENANT", "/tenant/payments");
  const home = await getTenantHome(session.userId);
  const ended = home ? home.leaseStatus === "ENDED" || home.leaseStatus === "TERMINATED" : false;
  const billing = home && !ended ? await getTenantBilling(home.leaseId) : null;
  const balance = billing?.summary.balanceCents ?? 0;
  const pastDue = billing?.summary.pastDueCents ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Rent</h1>

      {!home ? (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <p className="text-stone-700">
            Your home is not connected yet. Open the invite link your landlord sent you.
          </p>
        </section>
      ) : !billing ? (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <p className="text-xl font-semibold tracking-tight text-stone-900">Nothing is due</p>
          <p className="mt-1 text-stone-600">
            When {home.orgName} adds rent or another charge, it shows up here with its due date.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <p className="text-sm text-stone-500">
              {balance > 0 ? "You owe" : "You owe nothing right now"}
            </p>
            <p className="mt-0.5 text-4xl font-semibold tabular-nums tracking-tight text-stone-900">
              {formatCents(balance)}
            </p>
            {pastDue > 0 ? (
              <p className="mt-1 text-sm font-medium text-red-700">
                {formatCents(pastDue)} of it is past due
              </p>
            ) : balance === 0 ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-stone-600">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-patina" />
                All paid up
              </p>
            ) : billing.summary.nextDueDate ? (
              <p className="mt-1 text-sm text-stone-600">
                Due {formatLeaseDate(billing.summary.nextDueDate)}
              </p>
            ) : null}
            <p className="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-600">
              Pay {home.orgName} the way you do today. This page keeps track of what is due.
            </p>
          </section>

          {billing.charges.length > 0 && (
            <Section title="What is due">
              <ul className="divide-y divide-stone-100">
                {billing.charges.map((c) => (
                  <li key={c.id} className="flex min-h-14 items-center justify-between gap-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-stone-900">
                        {c.description}
                      </span>
                      <span
                        className={`block text-sm ${c.overdue ? "font-medium text-red-700" : "text-stone-500"}`}
                      >
                        {c.overdue ? "Was due " : "Due "}
                        {formatLeaseDate(c.dueDate)}
                      </span>
                    </span>
                    <span className="shrink-0 text-base font-semibold tabular-nums text-stone-900">
                      {formatCents(c.openCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
