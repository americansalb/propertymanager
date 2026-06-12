import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getProperty, revealAccessCodes } from "@/lib/services/property";
import { NotFoundError } from "@/lib/authz/api";
import { UnitsManager, type UnitView } from "@/components/landlord/units-manager";
import { PropertyDeleteButton } from "@/components/landlord/property-delete-button";
import { PropertyDetailsCard } from "@/components/landlord/property-details-card";
import { PropertyHeaderEditor } from "@/components/landlord/property-header-editor";
import { PortraitStudio } from "@/components/landlord/portrait-studio";
import { PhotoStrip } from "@/components/landlord/photo-strip";
import { listPhotos, PHOTO_LIMITS } from "@/lib/services/photos";
import { Badge } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";

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
    securityDepositCents: u.securityDepositCents,
    petDepositCents: u.petDepositCents,
    petRentCents: u.petRentCents,
    parkingSpot: u.parkingSpot,
    parkingRentCents: u.parkingRentCents,
    utilitiesIncluded: u.utilitiesIncluded,
    status: u.status,
  }));

  const photos = await listPhotos(
    { userId: session.userId, orgId: session.orgId },
    "Property",
    property.id,
  );
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
        <PortraitStudio
          propertyId={property.id}
          type={property.type}
          units={units}
          prefs={{
            portraitSeed: property.portraitSeed,
            portraitBody: property.portraitBody,
            portraitRoof: property.portraitRoof,
            portraitAccent: property.portraitAccent,
          }}
        />
        <PropertyHeaderEditor
          property={{
            id: property.id,
            name: property.name,
            type: property.type,
            address1: property.address1,
            address2: property.address2,
            city: property.city,
            state: property.state,
            zipCode: property.zipCode,
            alternateAddress: property.alternateAddress,
          }}
          chips={
            <>
              <Badge tone={occupied === units.length && units.length > 0 ? "patina" : "amber"}>
                {occupied} of {units.length} occupied
              </Badge>
              {rentMissing > 0 && (
                <Badge tone="copper">
                  rent not set on {rentMissing} unit{rentMissing === 1 ? "" : "s"}
                </Badge>
              )}
            </>
          }
        />
        <div className="flex shrink-0 items-center gap-3">
          <PropertyDeleteButton propertyId={property.id} />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
          Photos
        </h2>
        <PhotoStrip
          entityType="Property"
          entityId={property.id}
          photos={photos}
          limit={PHOTO_LIMITS.Property}
        />
      </section>

      <UnitsManager propertyId={property.id} units={units} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <PropertyDetailsCard propertyId={property.id} details={details} />
      </div>
    </div>
  );
}
