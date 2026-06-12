import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getProperty, revealAccessCodes } from "@/lib/services/property";
import { NotFoundError } from "@/lib/authz/api";
import { UnitsManager, type UnitView } from "@/components/landlord/units-manager";
import { PropertyDeleteButton } from "@/components/landlord/property-delete-button";
import { PropertyDetailsCard } from "@/components/landlord/property-details-card";
import { PropertyPortrait } from "@/components/brand/property-portrait";
import { Badge, Card } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";

export const metadata = { title: "Property" };

const TYPE_LABEL: Record<string, string> = {
  SINGLE_FAMILY: "Single family",
  MULTIFAMILY: "Multifamily",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

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

  const occupied = units.filter((u) => u.status === "OCCUPIED").length;
  const rentMissing = units.filter((u) => u.marketRentCents == null).length;
  const codes = revealAccessCodes(property.accessCodes);
  const details = {
    alternateAddress: property.alternateAddress,
    yearBuilt: property.yearBuilt,
    parkingNotes: property.parkingNotes,
    waterShutoffLocation: property.waterShutoffLocation,
    breakerPanelLocation: property.breakerPanelLocation,
    accessCodes: codes.value,
    accessLocked: codes.locked,
    petsAllowed: property.petsAllowed,
    petNotes: property.petNotes,
    notes: property.notes,
    tags: property.tags,
  };

  return (
    <div>
      <Link
        href="/landlord/properties"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
      >
        <IconChevronLeft className="h-3 w-3" /> Properties
      </Link>

      <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-start">
        <Card className="w-44 shrink-0 px-3 pt-4 pb-3">
          <PropertyPortrait
            seedKey={property.id}
            type={property.type}
            units={units}
            className="h-auto w-full"
          />
        </Card>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
            {property.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {property.address1}
            {property.address2 ? `, ${property.address2}` : ""} · {property.city},{" "}
            {property.state} {property.zipCode}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{TYPE_LABEL[property.type] ?? property.type}</Badge>
            <Badge tone={occupied === units.length && units.length > 0 ? "patina" : "amber"}>
              {occupied} of {units.length} occupied
            </Badge>
            {rentMissing > 0 && (
              <Badge tone="copper">
                rent not set on {rentMissing} unit{rentMissing === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/landlord/properties/${property.id}/edit`}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-patina hover:text-stone-900"
          >
            Edit
          </Link>
          <PropertyDeleteButton propertyId={property.id} />
        </div>
      </div>

      <UnitsManager propertyId={property.id} units={units} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <PropertyDetailsCard propertyId={property.id} details={details} />
      </div>
    </div>
  );
}
