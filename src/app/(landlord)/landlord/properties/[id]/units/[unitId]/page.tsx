import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { getUnit } from "@/lib/services/property";
import { getUnitLeasePanel } from "@/lib/services/lease";
import { listPhotos, PHOTO_LIMITS } from "@/lib/services/photos";
import { NotFoundError } from "@/lib/authz/api";
import { formatLeaseDate, isoDateOnly, ordinal } from "@/lib/leases";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui";
import { PhotoStrip } from "@/components/landlord/photo-strip";
import {
  LeaseTerms,
  StartLease,
  TenantAccess,
  type InviteLine,
  type LeaseView,
  type TenantLine,
} from "@/components/landlord/lease-panel";
import {
  UnitAskingTerms,
  UnitFacts,
  UnitStatusSelect,
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
        sharedFields: panel.lease.sharedFields,
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
    unit.bedrooms != null ? (unit.bedrooms === 0 ? "Studio" : `${unit.bedrooms} bed`) : null,
    unit.bathrooms != null ? `${Number(unit.bathrooms)} bath` : null,
    unit.squareFeet != null ? `${unit.squareFeet.toLocaleString()} sq ft` : null,
  ].filter(Boolean);

  const lease = panel?.lease ?? null;
  const names = tenantLines.map((t) => t.name);
  const who =
    names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const livedIn = lease != null && tenantLines.length > 0;
  const daysToEnd =
    lease?.endDate != null
      ? Math.ceil((lease.endDate.getTime() - Date.now()) / 86_400_000)
      : null;
  const endingSoon = daysToEnd != null && daysToEnd >= 0 && daysToEnd <= 60;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/landlord/properties/${unit.property.id}`}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-stone-600 hover:text-stone-900"
      >
        <IconChevronLeft className="h-3 w-3" /> {unit.property.name}
      </Link>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900">
            {unitTitle(unit.unitNumber)}
          </h1>
          {specs.length > 0 && <p className="mt-1 text-stone-600">{specs.join(" · ")}</p>}
        </div>
        <UnitStatusSelect unitId={unit.id} unitNumber={unit.unitNumber} status={unit.status} />
      </div>

      {/* The answer first: who is here and what happens next. */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        {livedIn && lease ? (
          <>
            <p className="text-sm text-stone-500">Lives here</p>
            <p className="mt-0.5 text-2xl font-semibold tracking-tight text-stone-900">{who}</p>
            <dl className="mt-4 grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-stone-500">Rent</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-stone-900">
                  {formatCents(lease.monthlyRentCents)}
                  <span className="text-sm font-normal text-stone-500"> a month</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">Due</dt>
                <dd className="mt-0.5 text-lg font-semibold text-stone-900">
                  The {ordinal(lease.rentDueDay)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">Lease ends</dt>
                <dd className="mt-0.5 text-lg font-semibold text-stone-900">
                  {lease.endDate ? formatLeaseDate(lease.endDate) : "Month to month"}
                </dd>
                {endingSoon && (
                  <p className="text-sm font-medium text-copper-deep">
                    {daysToEnd === 0 ? "Today" : `In ${daysToEnd} day${daysToEnd === 1 ? "" : "s"}`}
                  </p>
                )}
              </div>
            </dl>
          </>
        ) : lease ? (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-copper-deep">
              <span className="h-2 w-2 rounded-full bg-copper" />
              Needs you
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
              Finish this lease
            </p>
            <ol className="mt-4 space-y-3 border-t border-stone-100 pt-4">
              <li className="flex gap-3">
                <StepMark done />
                <div>
                  <p className="font-medium text-stone-900">The terms are on file</p>
                  <p className="text-sm text-stone-500">
                    {formatCents(lease.monthlyRentCents)} a month, starting{" "}
                    {formatLeaseDate(lease.startDate)}. Change anything below.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <StepMark done={inviteLines.length > 0} />
                <div>
                  <p className="font-medium text-stone-900">
                    {inviteLines.length > 0 ? "Your tenant is invited" : "Invite your tenant"}
                  </p>
                  <p className="text-sm text-stone-500">
                    {inviteLines.length > 0
                      ? `We sent a link to ${inviteLines.map((i) => i.email).join(" and ")}.`
                      : "Enter their email in the Tenant section below."}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <StepMark />
                <div>
                  <p className="font-medium text-stone-900">They accept</p>
                  <p className="text-sm text-stone-500">
                    The lease becomes active by itself the moment they do.
                  </p>
                </div>
              </li>
            </ol>
          </>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight text-stone-900">
                {unit.status === "VACANT" ? "Nobody lives here yet" : "There is no lease on file"}
              </p>
              <p className="mt-1 text-stone-600">
                {unit.status === "VACANT"
                  ? unit.marketRentCents != null
                    ? `Asking ${formatCents(unit.marketRentCents)} a month. Adding a tenant starts the lease from the asking terms below.`
                    : "Adding a tenant starts the lease from the asking terms below."
                  : "Put it on file so the rent, dates and tenant are all in one place."}
              </p>
            </div>
            <div className="shrink-0">
              <StartLease
                unitId={unit.id}
                label={unit.status === "VACANT" ? "Add a tenant" : "Put the lease on file"}
              />
            </div>
          </div>
        )}
      </section>

      {!leaseView && (
        <Section title="Asking terms" hint="A new lease starts as a copy of these.">
          <UnitAskingTerms unit={view} />
        </Section>
      )}

      {leaseView && (
        <>
          <Section
            title="Lease"
            aside={
              leaseView.status === "ACTIVE" ? (
                <Badge tone="patina">Active</Badge>
              ) : leaseView.status === "DRAFT" ? (
                <Badge tone="copper">Not finished</Badge>
              ) : (
                <Badge tone="stone">{leaseView.status.toLowerCase()}</Badge>
              )
            }
          >
            <LeaseTerms
              lease={leaseView}
              canRemove={leaseView.status === "DRAFT" && tenantLines.length === 0}
            />
          </Section>

          <Section title="Tenant">
            <TenantAccess lease={leaseView} tenants={tenantLines} invitations={inviteLines} />
          </Section>
        </>
      )}

      <Section title="This home">
        <UnitFacts unit={view} />
      </Section>

      <Section title="Photos">
        <PhotoStrip
          entityType="Unit"
          entityId={unit.id}
          photos={photos}
          limit={PHOTO_LIMITS.Unit}
        />
      </Section>

      {leaseView && (
        <details className="group mt-5 rounded-2xl border border-stone-200 bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 sm:px-6">
            <span>
              <span className="font-semibold text-stone-900">Asking terms for the next tenant</span>
              <span className="ml-2 text-sm text-stone-500">
                {unit.marketRentCents != null
                  ? `${formatCents(unit.marketRentCents)} a month`
                  : "Not set"}
              </span>
            </span>
            <span className="text-sm font-medium text-stone-500 group-open:hidden">Show</span>
            <span className="hidden text-sm font-medium text-stone-500 group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-stone-100 px-5 pb-5 pt-2 sm:px-6">
            <p className="py-2 text-sm text-stone-500">
              These do not change the current lease. The next lease starts as a copy of them.
            </p>
            <UnitAskingTerms unit={view} />
          </div>
        </details>
      )}
    </div>
  );
}

/** A titled white card: every section of the page looks the same. */
function Section({
  title,
  hint,
  aside,
  children,
}: {
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-stone-900">{title}</h2>
        {aside}
      </div>
      {hint && <p className="-mt-1 mb-2 text-sm text-stone-500">{hint}</p>}
      {children}
    </section>
  );
}

/** A step's tick: green when done, an empty ring while waiting. */
function StepMark({ done = false }: { done?: boolean }) {
  return done ? (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-patina text-xs font-bold text-white"
    >
      ✓
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-stone-300"
    />
  );
}
