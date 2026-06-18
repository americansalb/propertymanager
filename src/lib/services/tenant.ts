import { prisma } from "@/lib/db";
import { tenantLeaseTerms, type TenantLeaseTerms } from "@/lib/leases";

/**
 * The tenant's home, selected field by field: never access codes, landlord
 * notes, or anything about other units beyond the statuses the portrait
 * paints. Money details only cross when the landlord shares the lease.
 */

export type TenantHome = {
  orgName: string;
  unitNumber: string;
  unit: { bedrooms: number | null; bathrooms: number | null; squareFeet: number | null };
  property: {
    id: string;
    name: string;
    type: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    zipCode: string;
    portraitSeed: number | null;
    portraitBody: string | null;
    portraitRoof: string | null;
    portraitAccent: string | null;
    unitStatuses: string[];
  };
  leaseId: string;
  leaseStatus: string;
  /** null = the landlord keeps the lease hidden. */
  terms: TenantLeaseTerms | null;
};

export async function getTenantHome(userId: string): Promise<TenantHome | null> {
  const profile = await prisma.tenantProfile.findUnique({
    where: { userId },
    select: {
      leaseTenants: {
        select: {
          lease: {
            include: {
              unit: {
                select: {
                  unitNumber: true,
                  bedrooms: true,
                  bathrooms: true,
                  squareFeet: true,
                  property: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      address1: true,
                      address2: true,
                      city: true,
                      state: true,
                      zipCode: true,
                      portraitSeed: true,
                      portraitBody: true,
                      portraitRoof: true,
                      portraitAccent: true,
                      org: { select: { name: true } },
                      units: { select: { status: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!profile || profile.leaseTenants.length === 0) return null;

  const leases = profile.leaseTenants.map((lt) => lt.lease);
  const lease =
    leases
      .filter((l) => l.status === "ACTIVE")
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0] ??
    leases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]!;

  const { unit } = lease;
  const property = unit.property;
  return {
    orgName: property.org.name,
    unitNumber: unit.unitNumber,
    unit: {
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms != null ? Number(unit.bathrooms) : null,
      squareFeet: unit.squareFeet,
    },
    property: {
      id: property.id,
      name: property.name,
      type: property.type,
      address1: property.address1,
      address2: property.address2,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      portraitSeed: property.portraitSeed,
      portraitBody: property.portraitBody,
      portraitRoof: property.portraitRoof,
      portraitAccent: property.portraitAccent,
      unitStatuses: property.units.map((u) => u.status),
    },
    leaseId: lease.id,
    leaseStatus: lease.status,
    terms: tenantLeaseTerms(lease),
  };
}
