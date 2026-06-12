import { PropertyForm } from "@/components/landlord/property-form";

export const metadata = { title: "Add property" };

export default function NewPropertyPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Add property</h1>
      <p className="mt-1 mb-6 text-sm text-stone-500">
        Single-family home? Just the address is enough. Building? Add the units below.
      </p>
      <PropertyForm mode="create" />
    </div>
  );
}
