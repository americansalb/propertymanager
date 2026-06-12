import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getProperty } from "@/lib/services/property";
import { NotFoundError } from "@/lib/authz/api";
import { PropertyForm } from "@/components/landlord/property-form";
import { IconChevronLeft } from "@/components/icons";

export const metadata = { title: "Edit property" };

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrg("/landlord/properties");
  const { id } = await params;

  let property;
  try {
    property = await getProperty({ userId: session.userId, orgId: session.orgId }, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/landlord/properties/${id}`}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
      >
        <IconChevronLeft className="h-3 w-3" /> {property.name}
      </Link>
      <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight text-stone-900">
          Edit property
        </h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">
          The name is yours to change; everything else should match the deed.
        </p>
        <PropertyForm
          mode="edit"
          propertyId={id}
          initial={{
            name: property.name,
            type: property.type,
            address1: property.address1,
            address2: property.address2 ?? "",
            city: property.city,
            state: property.state,
            zipCode: property.zipCode,
          }}
        />
      </div>
    </div>
  );
}
