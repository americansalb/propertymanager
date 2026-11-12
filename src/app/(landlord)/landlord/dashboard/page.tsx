import { requireOrg } from "@/lib/authz";
import { getDashboard } from "@/lib/services/dashboard";
import { Button, Section } from "@/components/ui";
import { AttentionList, PulseBar, SetupChain } from "@/components/landlord/dashboard-ui";
import { PropertyRow } from "@/components/landlord/property-row";

export const metadata = { title: "Dashboard" };

export default async function LandlordDashboard() {
  const session = await requireOrg("/landlord/dashboard");
  const { pulse, setup, items, portfolio } = await getDashboard({
    userId: session.userId,
    orgId: session.orgId,
  });

  const hasSample = items.some((i) => i.kind === "sample");
  // While getting set up is the story, keep the list quiet, except the
  // sample property, which exists to show the list working.
  const visibleItems = setup.complete || hasSample ? items : [];
  const needing = visibleItems.filter((i) => i.kind !== "sample").length;

  // The page title is the answer.
  const headline = !setup.complete
    ? "Let's get you set up"
    : needing === 0
      ? "Nothing needs you today"
      : needing === 1
        ? "1 thing needs you"
        : `${needing} things need you`;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-stone-500">Hello, {session.firstName}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{headline}</h1>
      {setup.complete && needing === 0 && (
        <p className="mt-1 text-stone-600">No late rent and no vacant units.</p>
      )}

      {!setup.complete && <SetupChain setup={setup} showSample={!hasSample} />}

      {visibleItems.length > 0 && <AttentionList items={visibleItems} />}

      {pulse.unitCount > 0 && <PulseBar pulse={pulse} />}

      {portfolio.length > 0 && (
        <Section
          title={portfolio.length === 1 ? "Your property" : "Your properties"}
          aside={
            <Button href="/landlord/properties/new" variant="secondary" size="sm">
              Add a property
            </Button>
          }
        >
          <ul className="divide-y divide-stone-100">
            {portfolio.map((p) => (
              <li key={p.id}>
                <PropertyRow property={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
