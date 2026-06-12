import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import {
  toUnitData,
  type PropertyCreateInput,
  type PropertyUpdateInput,
  type UnitInput,
} from "@/lib/validation/property";

// Every query in this service is scoped by ctx.orgId. Cross-org access
// surfaces as NotFoundError (404) — existence is never revealed.

export function listProperties(ctx: OrgCtx) {
  return prisma.property.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { units: true } } },
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
  const { units, address2, ...rest } = input;
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

export async function updateUnit(ctx: OrgCtx, unitId: string, input: UnitInput) {
  const existing = await prisma.unit.findFirst({ where: { id: unitId, orgId: ctx.orgId } });
  if (!existing) throw new NotFoundError("Unit not found.");
  try {
    const unit = await prisma.unit.update({ where: { id: unitId }, data: toUnitData(input) });
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
      throw new ConflictError(`Unit "${input.unitNumber}" already exists on this property.`);
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
