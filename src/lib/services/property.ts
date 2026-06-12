import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/crypto";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import {
  isSameAddress,
  toUnitData,
  toUnitUpdateData,
  type PropertyCreateInput,
  type PropertyDetailsInput,
  type PropertyUpdateInput,
  type UnitInput,
  type UnitUpdateInput,
} from "@/lib/validation/property";

// Every query in this service is scoped by ctx.orgId. Cross-org access
// surfaces as NotFoundError (404) - existence is never revealed.

export type PropertyListFilter = {
  q?: string;
  type?: string;
  tag?: string;
};

export function listProperties(ctx: OrgCtx, filter: PropertyListFilter = {}) {
  const where: Prisma.PropertyWhereInput = { orgId: ctx.orgId };
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: "insensitive" } },
      { address1: { contains: filter.q, mode: "insensitive" } },
      { alternateAddress: { contains: filter.q, mode: "insensitive" } },
      { city: { contains: filter.q, mode: "insensitive" } },
      { zipCode: { contains: filter.q } },
    ];
  }
  if (filter.type) where.type = filter.type as Prisma.PropertyWhereInput["type"];
  if (filter.tag) where.tags = { has: filter.tag };
  return prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { units: { select: { id: true, status: true }, orderBy: { unitNumber: "asc" } } },
  });
}

export async function getProperty(ctx: OrgCtx, id: string) {
  const property = await prisma.property.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { units: { orderBy: { unitNumber: "asc" } } },
  });
  if (!property) throw new NotFoundError("Property not found.");
  return property;
}

export async function createProperty(ctx: OrgCtx, input: PropertyCreateInput) {
  const { units, address2, allowDuplicate, ...rest } = input;

  // Duplicate guard compares the FULL address (line 2 counts, so two condos
  // at one street address are fine) and is overridable: reality wins.
  if (!allowDuplicate) {
    const candidates = await prisma.property.findMany({
      where: {
        orgId: ctx.orgId,
        zipCode: input.zipCode,
        address1: { equals: input.address1, mode: "insensitive" },
      },
      select: { name: true, address1: true, address2: true },
    });
    const duplicate = candidates.find((c) => isSameAddress(c, input));
    if (duplicate) {
      throw new ConflictError(
        `You already have a property at this exact address (${duplicate.name}).`,
      );
    }
  }
  const unitData =
    units.length > 0
      ? units.map((u) => ({ ...toUnitData(u), orgId: ctx.orgId }))
      : [{ unitNumber: "Main", bedrooms: null, bathrooms: null, squareFeet: null, marketRentCents: null, orgId: ctx.orgId }];

  const duplicates = new Set(unitData.map((u) => u.unitNumber.toLowerCase()));
  if (duplicates.size !== unitData.length) {
    throw new ConflictError("Unit numbers must be unique within a property.");
  }

  const property = await prisma.property.create({
    data: {
      ...rest,
      address2: address2 || null,
      orgId: ctx.orgId,
      units: { create: unitData },
    },
    include: { units: true },
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "property.create",
    entityType: "Property",
    entityId: property.id,
    meta: { name: property.name, units: unitData.length },
  });
  return property;
}

export async function updateProperty(ctx: OrgCtx, id: string, input: PropertyUpdateInput) {
  await getProperty(ctx, id); // org-scoped existence check
  const { address2, ...rest } = input;
  const property = await prisma.property.update({
    where: { id },
    data: { ...rest, ...(address2 !== undefined ? { address2: address2 || null } : {}) },
  });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "property.update",
    entityType: "Property",
    entityId: id,
  });
  return property;
}

/** Decrypted access codes for display, or a flag when undecryptable. */
export function revealAccessCodes(stored: string | null): {
  value: string | null;
  locked: boolean;
} {
  if (!stored) return { value: null, locked: false };
  try {
    return { value: isEncrypted(stored) ? decryptSecret(stored) : null, locked: false };
  } catch {
    return { value: null, locked: true };
  }
}

export async function updatePropertyDetails(
  ctx: OrgCtx,
  id: string,
  input: PropertyDetailsInput,
) {
  await getProperty(ctx, id); // org-scoped existence check
  const { accessCodes, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (accessCodes !== undefined) {
    data.accessCodes = accessCodes === null ? null : encryptSecret(accessCodes);
  }
  const property = await prisma.property.update({ where: { id }, data });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "property.update_details",
    entityType: "Property",
    entityId: id,
    // Never log secret values; field names only.
    meta: { fields: Object.keys(input) },
  });
  return property;
}

export async function deleteProperty(ctx: OrgCtx, id: string) {
  await getProperty(ctx, id);
  const leases = await prisma.lease.count({ where: { unit: { propertyId: id } } });
  if (leases > 0) {
    throw new ConflictError("This property has leases. End or delete them first.");
  }
  await prisma.property.delete({ where: { id } }); // units cascade
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "property.delete",
    entityType: "Property",
    entityId: id,
  });
}

export async function createUnit(ctx: OrgCtx, propertyId: string, input: UnitInput) {
  await getProperty(ctx, propertyId);
  try {
    const unit = await prisma.unit.create({
      data: { ...toUnitData(input), propertyId, orgId: ctx.orgId },
    });
    void audit({
      actorUserId: ctx.userId,
      orgId: ctx.orgId,
      action: "unit.create",
      entityType: "Unit",
      entityId: unit.id,
      meta: { propertyId, unitNumber: unit.unitNumber },
    });
    return unit;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError(`Unit "${input.unitNumber}" already exists on this property.`);
    }
    throw e;
  }
}

export async function updateUnit(ctx: OrgCtx, unitId: string, input: UnitUpdateInput) {
  const existing = await prisma.unit.findFirst({ where: { id: unitId, orgId: ctx.orgId } });
  if (!existing) throw new NotFoundError("Unit not found.");
  try {
    const unit = await prisma.unit.update({
      where: { id: unitId },
      data: toUnitUpdateData(input),
    });
    void audit({
      actorUserId: ctx.userId,
      orgId: ctx.orgId,
      action: "unit.update",
      entityType: "Unit",
      entityId: unitId,
    });
    return unit;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictError(
        `Unit "${input.unitNumber ?? existing.unitNumber}" already exists on this property.`,
      );
    }
    throw e;
  }
}

export async function deleteUnit(ctx: OrgCtx, unitId: string) {
  const existing = await prisma.unit.findFirst({
    where: { id: unitId, orgId: ctx.orgId },
    include: { _count: { select: { leases: true } } },
  });
  if (!existing) throw new NotFoundError("Unit not found.");
  if (existing._count.leases > 0) {
    throw new ConflictError("This unit has leases. End or delete them first.");
  }
  await prisma.unit.delete({ where: { id: unitId } });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "unit.delete",
    entityType: "Unit",
    entityId: unitId,
  });
}
