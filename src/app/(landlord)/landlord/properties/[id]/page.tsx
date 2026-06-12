import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getProperty } from "@/lib/services/property";
import { NotFoundError } from "@/lib/authz/api";
import { UnitsManager, type UnitView } from "@/components/landlord/units-manager";
import { PropertyDeleteButton } from "@/components/landlord/property-delete-button";

export const metadata = { title: "Property" };

export default async function PropertyDetailPage({
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

  const units: UnitView[] = property.units.map((u) => ({
    id: u.id,
    unitNumber: u.unitNumber,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms != null ? Number(u.bathrooms) : null,
    squareFeet: u.squareFeet,
    marketRentCents: u.marketRentCents,
    status: u.status,
  }));

  return (
    <div>
      <Link href="/landlord/properties" className="text-sm text-stone-500 hover:text-stone-700">
        ← Properties
      </Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{property.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {property.address1}
            {property.address2 ? `, ${property.address2}` : ""} · {property.city},{" "}
            {property.state} {property.zipCode}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/landlord/properties/${property.id}/edit`}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-400"
          >
            Edit
          </Link>
          <PropertyDeleteButton propertyId={property.id} />
        </div>
      </div>

      <UnitsManager propertyId={property.id} units={units} />
    </div>
  );
}
