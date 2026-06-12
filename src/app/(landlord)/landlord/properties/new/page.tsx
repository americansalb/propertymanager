import { PropertyForm } from "@/components/landlord/property-form";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Add property" };

export default function NewPropertyPage() {
  return (
    <div>
      <PageTitle>Add property</PageTitle>
      <p className="mt-1 mb-6 text-sm text-stone-500">
        Single-family home? Just the address is enough. Building? Add the units below.
      </p>
      <PropertyForm mode="create" />
    </div>
  );
}
