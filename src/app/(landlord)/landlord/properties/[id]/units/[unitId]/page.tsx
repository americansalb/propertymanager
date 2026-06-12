import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getUnit } from "@/lib/services/property";
import { listPhotos, PHOTO_LIMITS } from "@/lib/services/photos";
import { NotFoundError } from "@/lib/authz/api";
import { Card } from "@/components/ui";
import { PhotoStrip } from "@/components/landlord/photo-strip";
import {
  UnitStatusSelect,
  UnitTermsGrid,
  type UnitView,
} from "@/components/landlord/unit-terms";
import { unitTitle } from "@/lib/units";
import { IconChevronLeft } from "@/components/icons";

export const metadata = { title: "Unit" };

export default async function UnitProfilePage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const session = await requireOrg("/landlord/properties");
  const { unitId } = await params;

  let unit;
  try {
    unit = await getUnit({ userId: session.userId, orgId: session.orgId }, unitId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const photos = await listPhotos(
    { userId: session.userId, orgId: session.orgId },
    "Unit",
    unit.id,
  );

  const view: UnitView = {
    id: unit.id,
    unitNumber: unit.unitNumber,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms != null ? Number(unit.bathrooms) : null,
    squareFeet: unit.squareFeet,
    marketRentCents: unit.marketRentCents,
    securityDepositCents: unit.securityDepositCents,
    petDepositCents: unit.petDepositCents,
    petRentCents: unit.petRentCents,
    parkingSpot: unit.parkingSpot,
    parkingRentCents: unit.parkingRentCents,
    utilitiesIncluded: unit.utilitiesIncluded,
    status: unit.status,
  };

  const specs = [
    unit.bedrooms != null ? `${unit.bedrooms} bd` : null,
    unit.bathrooms != null ? `${Number(unit.bathrooms)} ba` : null,
    unit.squareFeet != null ? `${unit.squareFeet.toLocaleString()} sqft` : null,
  ].filter(Boolean);

  return (
    <div>
      <Link
        href={`/landlord/properties/${unit.property.id}`}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
      >
        <IconChevronLeft className="h-3 w-3" /> {unit.property.name}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
          {unitTitle(unit.unitNumber)}
        </h1>
        <UnitStatusSelect unitId={unit.id} unitNumber={unit.unitNumber} status={unit.status} />
        {specs.length > 0 && <span className="text-sm text-stone-500">{specs.join(" · ")}</span>}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
          Photos
        </h2>
        <PhotoStrip
          entityType="Unit"
          entityId={unit.id}
          photos={photos}
          limit={PHOTO_LIMITS.Unit}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
          Terms
        </h2>
        <Card className="p-5">
          <UnitTermsGrid unit={view} />
        </Card>
      </section>

      <p className="mt-6 text-xs text-stone-400">
        Lease, tenant, and payment history live here next: they arrive with tenant invites.
      </p>
    </div>
  );
}
