import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { getTenantHome } from "@/lib/services/tenant";
import { getTenantBilling } from "@/lib/services/charges";
import { formatCents } from "@/lib/money";
import { formatLeaseDate } from "@/lib/leases";
import { InfoRow, Section } from "@/components/ui";
import { unitTitle } from "@/lib/units";
import { IconChevronRight } from "@/components/icons";

export const metadata = { title: "Home" };

const rowLink =
  "group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50";

export default async function TenantDashboard() {
  const session = await requireRole("TENANT", "/tenant/dashboard");
  const home = await getTenantHome(session.userId);

  if (!home) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-stone-500">Hello, {session.firstName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
          Your home is not connected yet
        </h1>
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <p className="text-stone-700">
            Ask your landlord for an invite link. Once you open it, your rent, your lease and a way
            to report problems all show up here.
          </p>
        </section>
      </div>
    );
  }

  const p = home.property;
  const homeTitle =
    home.unitNumber.toLowerCase() === "main"
      ? p.address1
      : `${unitTitle(home.unitNumber)}, ${p.address1}`;
  const ended = home.leaseStatus === "ENDED" || home.leaseStatus === "TERMINATED";
  const billing = ended ? null : await getTenantBilling(home.leaseId);
  const terms = home.terms;
  const facts: Array<[string, string]> = terms
    ? ([
        ["Rent", terms.rentCents != null ? `${formatCents(terms.rentCents)} a month` : null],
        // The shared label reads "Due on the 1st"; under this row's label, drop the echo.
        [
          "Rent is due",
          terms.rentDueLabel ? `${terms.rentDueLabel.replace(/^Due on/, "On")} of each month` : null,
        ],
        ["Lease", terms.termLabel],
        ["Deposit held", terms.depositLabel],
        ["Pets", terms.petLabel],
        ["Parking", terms.parkingLabel],
        ["Utilities included", terms.utilities.length > 0 ? terms.utilities.join(", ") : null],
      ].filter(([, v]) => v != null) as Array<[string, string]>)
    : [];

  const balance = billing?.summary.balanceCents ?? 0;
  const pastDue = billing?.summary.pastDueCents ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-stone-500">Your home</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{homeTitle}</h1>
      <p className="mt-1 text-stone-600">
        {p.city}, {p.state} {p.zipCode}
      </p>

      {billing && (
        <Link
          href="/tenant/payments"
          className="group mt-6 flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-patina sm:p-6"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-stone-500">
              {balance > 0 ? "You owe" : "You owe nothing right now"}
            </span>
            <span className="mt-0.5 block text-3xl font-semibold tabular-nums tracking-tight text-stone-900">
              {formatCents(balance)}
            </span>
            {pastDue > 0 ? (
              <span className="mt-1 block text-sm font-medium text-red-700">
                {formatCents(pastDue)} of it is past due
              </span>
            ) : balance === 0 ? (
              <span className="mt-1 flex items-center gap-2 text-sm text-stone-600">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-patina" />
                All paid up
              </span>
            ) : billing.summary.nextDueDate ? (
              <span className="mt-1 block text-sm text-stone-600">
                Due {formatLeaseDate(billing.summary.nextDueDate)}
              </span>
            ) : null}
          </span>
          <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
        </Link>
      )}

      <section className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-2 sm:px-6">
        <ul className="divide-y divide-stone-100">
          <li>
            <Link href="/tenant/maintenance" className={rowLink}>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-stone-900">
                  Report a problem
                </span>
                <span className="mt-0.5 block text-sm text-stone-600">
                  Say what is wrong and when someone can come by.
                </span>
              </span>
              <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
            </Link>
          </li>
          <li>
            <Link href="/tenant/messages" className={rowLink}>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-stone-900">
                  Message {home.orgName}
                </span>
                <span className="mt-0.5 block text-sm text-stone-600">
                  Questions go straight to your landlord.
                </span>
              </span>
              <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
            </Link>
          </li>
        </ul>
      </section>

      <Section title="Your lease">
        {ended ? (
          <p className="py-1 text-stone-600">Your lease here has ended.</p>
        ) : facts.length > 0 ? (
          <dl>
            {facts.map(([label, value]) => (
              <InfoRow key={label} label={label}>
                {value}
              </InfoRow>
            ))}
          </dl>
        ) : (
          <p className="py-1 text-stone-600">
            {home.orgName} has not shared the lease details here yet.
          </p>
        )}
      </Section>

      <p className="mt-5 text-sm text-stone-500">This home is managed by {home.orgName}.</p>
    </div>
  );
}
