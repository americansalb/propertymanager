import { BackLink } from "@/components/ui";
import { PropertyWizard } from "@/components/landlord/property-wizard";

export const metadata = { title: "Add a property" };

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/landlord/properties">Properties</BackLink>
      <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
        <PropertyWizard />
      </div>
    </div>
  );
}
