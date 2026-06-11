import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getProperty } from "@/lib/services/property";
import { NotFoundError } from "@/lib/authz/api";
import { PropertyForm } from "@/components/landlord/property-form";

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
    <div>
      <Link href={`/landlord/properties/${id}`} className="text-sm text-stone-500 hover:text-stone-700">
        ← {property.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-stone-900">Edit property</h1>
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
  );
}
