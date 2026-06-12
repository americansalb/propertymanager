import { prisma } from "@/lib/db";
import type { OrgCtx } from "@/lib/authz/api";
import {
  buildSampleItem,
  buildVacancyItems,
  computeSetup,
  sortAttention,
  type AttentionItem,
  type SetupState,
} from "@/lib/attention";
import { findSample } from "@/lib/services/sample";

export type Pulse = {
  unitCount: number;
  occupiedCount: number;
  marketRentTotalCents: number;
  openMaintenance: number;
};

export type PortfolioProperty = {
  id: string;
  name: string;
  units: Array<{ id: string; status: string }>;
};

export type DashboardData = {
  pulse: Pulse;
  setup: SetupState;
  items: AttentionItem[];
  portfolio: PortfolioProperty[];
};

export async function getDashboard(ctx: OrgCtx): Promise<DashboardData> {
  const [propertyCount, units, openMaintenance, sample, portfolio] = await Promise.all([
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
    findSample(ctx),
    prisma.property.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, units: { select: { id: true, status: true } } },
    }),
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

  const items = sortAttention([
    ...vacancyItems,
    ...(sample ? [buildSampleItem(sample)] : []),
  ]);

  return { pulse, setup, items, portfolio };
}
