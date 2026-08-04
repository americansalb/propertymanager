import { prisma } from "@/lib/db";
import type { OrgCtx } from "@/lib/authz/api";
import {
  buildLateRentItems,
  buildMaintenanceItems,
  buildSampleItem,
  buildVacancyItems,
  computeSetup,
  sortAttention,
  type AttentionItem,
  type SetupState,
} from "@/lib/attention";
import { findSample } from "@/lib/services/sample";
import { getOrgLateRent } from "@/lib/services/charges";

export type Pulse = {
  unitCount: number;
  occupiedCount: number;
  marketRentTotalCents: number;
  openMaintenance: number;
};

export type PortfolioProperty = {
  id: string;
  name: string;
  type: string;
  portraitSeed: number | null;
  portraitBody: string | null;
  portraitRoof: string | null;
  portraitAccent: string | null;
  units: Array<{ id: string; status: string }>;
};

export type DashboardData = {
  pulse: Pulse;
  setup: SetupState;
  items: AttentionItem[];
  portfolio: PortfolioProperty[];
};

export async function getDashboard(ctx: OrgCtx): Promise<DashboardData> {
  const [
    propertyCount,
    units,
    openMaintenance,
    openMaintReqs,
    sample,
    portfolio,
    tenantInvites,
    tenantsJoined,
    lateRent,
  ] = await Promise.all([
    prisma.property.count({ where: { orgId: ctx.orgId } }),
    prisma.unit.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        unitNumber: true,
        status: true,
        marketRentCents: true,
        propertyId: true,
        property: { select: { name: true } },
      },
    }),
    prisma.maintenanceRequest.count({
      where: {
        orgId: ctx.orgId,
        status: { in: ["SUBMITTED", "ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS"] },
      },
    }),
    // Requests a tenant is waiting on (not yet scheduled or in progress): these
    // become NEEDS YOU cards, emergencies first.
    prisma.maintenanceRequest.findMany({
      where: { orgId: ctx.orgId, status: { in: ["SUBMITTED", "ACKNOWLEDGED"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        urgency: true,
        propertyId: true,
        property: { select: { name: true } },
        unit: { select: { unitNumber: true } },
      },
    }),
    findSample(ctx),
    prisma.property.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        portraitSeed: true,
        portraitBody: true,
        portraitRoof: true,
        portraitAccent: true,
        units: { select: { id: true, status: true }, orderBy: { unitNumber: "asc" } },
      },
    }),
    prisma.invitation.count({ where: { orgId: ctx.orgId, kind: "TENANT" } }),
    prisma.leaseTenant.count({ where: { lease: { orgId: ctx.orgId } } }),
    getOrgLateRent(ctx.orgId),
  ]);

  const pulse: Pulse = {
    unitCount: units.length,
    occupiedCount: units.filter((u) => u.status === "OCCUPIED").length,
    marketRentTotalCents: units.reduce((s, u) => s + (u.marketRentCents ?? 0), 0),
    openMaintenance,
  };

  const setup = computeSetup({
    propertyCount,
    unitsWithRent: units.filter((u) => u.marketRentCents != null).length,
    tenantInvites,
    tenantsJoined,
  });

  const vacancyItems = buildVacancyItems(
    units
      .filter((u) => u.status === "VACANT")
      .map((u) => ({
        unitId: u.id,
        unitNumber: u.unitNumber,
        propertyId: u.propertyId,
        propertyName: u.property.name,
        marketRentCents: u.marketRentCents,
      })),
  );

  const maintenanceItems = buildMaintenanceItems(
    openMaintReqs.map((r) => ({
      id: r.id,
      title: r.title,
      urgency: r.urgency,
      unitNumber: r.unit?.unitNumber ?? null,
      propertyId: r.propertyId,
      propertyName: r.property.name,
    })),
  );

  const items = sortAttention([
    ...maintenanceItems,
    ...buildLateRentItems(lateRent),
    ...vacancyItems,
    ...(sample ? [buildSampleItem(sample)] : []),
  ]);

  return { pulse, setup, items, portfolio };
}
