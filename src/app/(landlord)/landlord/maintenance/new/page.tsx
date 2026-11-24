import { requireOrg } from "@/lib/authz";
import { listRepairPlaces } from "@/lib/services/maintenance";
import { getQuoteSettings, listContractors } from "@/lib/services/contractor";
import { BackLink, Button } from "@/components/ui";
import { NewRepairForm } from "@/components/landlord/new-repair-form";

export const metadata = { title: "Report a repair" };

export default async function NewRepairPage() {
  const session = await requireOrg("/landlord/maintenance/new");
  const ctx = { userId: session.userId, orgId: session.orgId };
  const [places, settings, people] = await Promise.all([
    listRepairPlaces(ctx),
    getQuoteSettings(ctx),
    listContractors(ctx),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/landlord/maintenance">Repairs</BackLink>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Report a repair</h1>
      <p className="mt-1 text-stone-600">
        For a problem you heard about by phone or text, or saw yourself.
      </p>

      {places.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <p className="text-xl font-semibold tracking-tight text-stone-900">Add a property first</p>
          <p className="mt-1 text-stone-600">A repair belongs to a home, so it needs one to go in.</p>
          <Button href="/landlord/properties/new" variant="accent" className="mt-5">
            Add a property
          </Button>
        </section>
      ) : (
        <NewRepairForm places={places} autoAsk={settings.autoAsk} peopleOnFile={people.length} />
      )}
    </div>
  );
}
