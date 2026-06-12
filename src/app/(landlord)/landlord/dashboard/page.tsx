import { requireOrg } from "@/lib/authz";
import { getDashboard } from "@/lib/services/dashboard";
import { PageTitle, SectionHeading } from "@/components/ui";
import {
  AllQuiet,
  AttentionCard,
  PortfolioStrip,
  PulseBar,
  SetupChain,
} from "@/components/landlord/dashboard-ui";

export const metadata = { title: "Dashboard" };

export default async function LandlordDashboard() {
  const session = await requireOrg("/landlord/dashboard");
  const { pulse, setup, items, portfolio } = await getDashboard({
    userId: session.userId,
    orgId: session.orgId,
  });

  const hasSample = items.some((i) => i.kind === "sample");
  // While the setup chain is the story, keep the queue quiet, except sample
  // data, which exists precisely to show the queue working.
  const visibleItems = setup.complete || hasSample ? items : [];

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Welcome, {session.firstName}</PageTitle>
        <p className="mt-1 text-sm text-stone-500">
          {setup.complete
            ? "Here's what needs you."
            : "Let's get set up; it only takes a couple of minutes."}
        </p>
      </div>

      {!setup.complete && <SetupChain setup={setup} showSample={!hasSample} />}

      {pulse.unitCount > 0 && <PulseBar pulse={pulse} />}

      {(visibleItems.length > 0 || setup.complete) && (
        <section className="space-y-3">
          <SectionHeading>Needs you</SectionHeading>
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => <AttentionCard key={item.id} item={item} />)
          ) : (
            <AllQuiet unitCount={pulse.unitCount} />
          )}
        </section>
      )}

      {portfolio.length > 0 && (
        <section className="space-y-3">
          <SectionHeading>Portfolio</SectionHeading>
          <PortfolioStrip portfolio={portfolio} />
        </section>
      )}
    </div>
  );
}
