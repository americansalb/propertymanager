import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { OrgCtx } from "@/lib/authz/api";

/**
 * One-click sample data: a brand-new landlord can feel the living dashboard
 * (pulse, vacancy item, portfolio) before typing anything. Removal is the
 * normal property delete; the name prefix is the marker.
 */
export const SAMPLE_PREFIX = "Sample: ";

export function findSample(ctx: OrgCtx) {
  return prisma.property.findFirst({
    where: { orgId: ctx.orgId, name: { startsWith: SAMPLE_PREFIX } },
    select: { id: true, name: true },
  });
}

export async function createSample(ctx: OrgCtx) {
  const existing = await findSample(ctx);
  if (existing) return existing;

  const property = await prisma.property.create({
    data: {
      orgId: ctx.orgId,
      name: `${SAMPLE_PREFIX}Oakdale Duplex`,
      type: "MULTIFAMILY",
      address1: "1247 W Oakdale Ave",
      city: "Chicago",
      state: "IL",
      zipCode: "60657",
      units: {
        create: [
          {
            orgId: ctx.orgId,
            unitNumber: "1F",
            bedrooms: 2,
            bathrooms: 1,
            squareFeet: 850,
            marketRentCents: 185_000,
            securityDepositCents: 185_000,
            petDepositCents: 30_000,
            petRentCents: 5_000,
            parkingSpot: "1 assigned spot, rear",
            parkingRentCents: 15_000,
            utilitiesIncluded: ["Water", "Trash"],
            status: "OCCUPIED",
          },
          {
            orgId: ctx.orgId,
            unitNumber: "2F",
            bedrooms: 2,
            bathrooms: 1,
            squareFeet: 875,
            marketRentCents: 192_500,
            securityDepositCents: 192_500,
            parkingSpot: "Street permit",
            parkingRentCents: 0,
            utilitiesIncluded: ["Water", "Trash", "Heat"],
            status: "VACANT",
          },
        ],
      },
    },
    select: { id: true, name: true },
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "property.sample_create",
    entityType: "Property",
    entityId: property.id,
  });
  return property;
}
