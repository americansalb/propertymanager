import { PropertyWizard } from "@/components/landlord/property-wizard";

export const metadata = { title: "Add property" };

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-stone-200 bg-white p-8">
        <PropertyWizard />
      </div>
    </div>
  );
}
