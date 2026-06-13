import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getUnit } from "@/lib/services/property";
import { getUnitLeasePanel } from "@/lib/services/lease";
import { listPhotos, PHOTO_LIMITS } from "@/lib/services/photos";
import { NotFoundError } from "@/lib/authz/api";
import { isoDateOnly } from "@/lib/leases";
import { Card } from "@/components/ui";
import { PhotoStrip } from "@/components/landlord/photo-strip";
import {
  LeaseSection,
  type InviteLine,
  type LeaseView,
  type TenantLine,
} from "@/components/landlord/lease-panel";
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
  const ctx = { userId: session.userId, orgId: session.orgId };
  const [photos, panel] = await Promise.all([
    listPhotos(ctx, "Unit", unit.id),
    getUnitLeasePanel(ctx, unit.id),
  ]);

  const leaseView: LeaseView | null = panel
    ? {
        id: panel.lease.id,
        status: panel.lease.status,
        startDate: isoDateOnly(panel.lease.startDate),
        endDate: panel.lease.endDate ? isoDateOnly(panel.lease.endDate) : null,
        monthlyRentCents: panel.lease.monthlyRentCents,
        securityDepositCents: panel.lease.securityDepositCents,
        rentDueDay: panel.lease.rentDueDay,
        lateFeeCents: panel.lease.lateFeeCents,
        lateFeeGraceDays: panel.lease.lateFeeGraceDays,
        petDepositCents: panel.lease.petDepositCents,
        petRentCents: panel.lease.petRentCents,
        parkingSpot: panel.lease.parkingSpot,
        parkingRentCents: panel.lease.parkingRentCents,
        utilitiesIncluded: panel.lease.utilitiesIncluded,
        shareWithTenant: panel.lease.shareWithTenant,
      }
    : null;
  const tenantLines: TenantLine[] =
    panel?.lease.tenants.map((t) => ({
      id: t.id,
      isPrimary: t.isPrimary,
      name: `${t.tenantProfile.user.firstName} ${t.tenantProfile.user.lastName}`,
      email: t.tenantProfile.user.email,
    })) ?? [];
  const inviteLines: InviteLine[] =
    panel?.invitations.map((i) => ({
      id: i.id,
      email: i.email,
      expiresAt: i.expiresAt.toISOString(),
    })) ?? [];

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

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
          Lease &amp; tenant
        </h2>
        <Card className="p-5">
          <LeaseSection
            unitId={unit.id}
            occupied={unit.status !== "VACANT"}
            lease={leaseView}
            tenants={tenantLines}
            invitations={inviteLines}
          />
        </Card>
      </section>

      <p className="mt-6 text-xs text-stone-400">
        Rent collection and payment history land here next.
      </p>
    </div>
  );
}
