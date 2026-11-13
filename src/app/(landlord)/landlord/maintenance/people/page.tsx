import { requireOrg } from "@/lib/authz";
import { getAutoAsk, listContractors } from "@/lib/services/contractor";
import { BackLink } from "@/components/ui";
import { RepairPeople } from "@/components/landlord/repair-people";

export const metadata = { title: "Your repair people" };

export default async function RepairPeoplePage() {
  const session = await requireOrg("/landlord/maintenance/people");
  const ctx = { userId: session.userId, orgId: session.orgId };
  const [people, autoAsk] = await Promise.all([listContractors(ctx), getAutoAsk(ctx)]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/landlord/maintenance">Repairs</BackLink>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
        Your repair people
      </h1>
      <p className="mt-1 text-stone-600">
        The people you already trust. They need no account: they answer through a link.
      </p>
      <RepairPeople people={people} autoAsk={autoAsk} />
    </div>
  );
}
