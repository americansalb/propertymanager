import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getProperty, revealAccessCodes } from "@/lib/services/property";
import { getUnitTenancyByProperty } from "@/lib/services/lease";
import { NotFoundError } from "@/lib/authz/api";
import { formatCents } from "@/lib/money";
import { PROPERTY_TYPE_LABEL, addressLine } from "@/lib/property-types";
import { UnitsManager, type UnitView } from "@/components/landlord/units-manager";
import { PropertyDeleteButton } from "@/components/landlord/property-delete-button";
import { PropertyDetailsCard } from "@/components/landlord/property-details-card";
import { PropertyFacts } from "@/components/landlord/property-header-editor";
import { PhotoStrip } from "@/components/landlord/photo-strip";
import { listPhotos, PHOTO_LIMITS } from "@/lib/services/photos";
import { BackLink, Section, Stat } from "@/components/ui";

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

  const tenancy = await getUnitTenancyByProperty(
    { userId: session.userId, orgId: session.orgId },
    property.id,
  );
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
    tenantNames: tenancy[u.id]?.tenantNames ?? [],
    pendingInviteEmail: tenancy[u.id]?.pendingInviteEmail ?? null,
    leaseRentCents: tenancy[u.id]?.leaseRentCents ?? null,
  }));

  const photos = await listPhotos(
    { userId: session.userId, orgId: session.orgId },
    "Property",
    property.id,
  );

  // The answer first: how full is it, and what does it bring in.
  const livedIn = units.filter((u) => u.status !== "VACANT");
  const vacant = units.filter((u) => u.status === "VACANT");
  const rentCents = livedIn.reduce(
    (sum, u) => sum + (u.leaseRentCents ?? u.marketRentCents ?? 0),
    0,
  );
  const askingCents = vacant.reduce((sum, u) => sum + (u.marketRentCents ?? 0), 0);

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
  const core = {
    id: property.id,
    name: property.name,
    type: property.type,
    address1: property.address1,
    address2: property.address2,
    city: property.city,
    state: property.state,
    zipCode: property.zipCode,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/landlord/properties">Properties</BackLink>

      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
        {property.name}
      </h1>
      <p className="mt-1 text-stone-600">{addressLine(core)}</p>
      <p className="text-sm text-stone-500">{PROPERTY_TYPE_LABEL[property.type] ?? "Property"}</p>

      {units.length > 0 && (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Stat
              label="Lived in"
              value={`${livedIn.length} of ${units.length}`}
              unit={units.length === 1 ? "unit" : "units"}
            />
            <Stat label="Rent each month" value={formatCents(rentCents)} />
            <Stat
              label="Vacant"
              value={vacant.length === 0 ? "None" : vacant.length}
              unit={vacant.length === 0 ? undefined : vacant.length === 1 ? "unit" : "units"}
              note={
                vacant.length > 0 && askingCents > 0
                  ? `Asking ${formatCents(askingCents)} a month`
                  : undefined
              }
              noteTone="copper"
            />
          </dl>
        </section>
      )}

      <UnitsManager propertyId={property.id} units={units} />

      <Section title="Building details">
        <PropertyDetailsCard propertyId={property.id} details={details} />
      </Section>

      <Section title="This property">
        <PropertyFacts property={core} />
      </Section>

      <Section title="Photos">
        <PhotoStrip
          entityType="Property"
          entityId={property.id}
          photos={photos}
          limit={PHOTO_LIMITS.Property}
        />
      </Section>

      <div className="mt-6">
        <PropertyDeleteButton propertyId={property.id} />
      </div>
    </div>
  );
}
