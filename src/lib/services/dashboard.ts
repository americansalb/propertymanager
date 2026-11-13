import { prisma } from "@/lib/db";
import type { OrgCtx } from "@/lib/authz/api";
import {
  buildLateRentItems,
  buildQuoteItems,
  buildSampleItem,
  buildVacancyItems,
  computeSetup,
  sortAttention,
  type AttentionItem,
  type SetupState,
} from "@/lib/attention";
import { findSample } from "@/lib/services/sample";
import { getOrgLateRent } from "@/lib/services/charges";
import { quoteCeilingCents } from "@/lib/quotes";

export type Pulse = {
  unitCount: number;
  occupiedCount: number;
  marketRentTotalCents: number;
  /** Rent on active leases: what actually comes in each month. */
  leaseRentTotalCents: number;
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
  address1: string;
  city: string;
  state: string;
  units: Array<{ id: string; status: string }>;
};

export type DashboardData = {
  pulse: Pulse;
  setup: SetupState;
  items: AttentionItem[];
  portfolio: PortfolioProperty[];
};

export async function getDashboard(ctx: OrgCtx): Promise<DashboardData> {
  const [propertyCount, units, openMaintenance, sample, portfolio, tenantInvites, tenantsJoined, lateRent, leaseRent, quoted] =
    await Promise.all([
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
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        address1: true,
        city: true,
        state: true,
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
    prisma.lease.aggregate({
      where: { orgId: ctx.orgId, status: "ACTIVE" },
      _sum: { monthlyRentCents: true },
    }),
    // Open repairs with prices in and nobody approved yet.
    prisma.maintenanceRequest.findMany({
      where: {
        orgId: ctx.orgId,
        status: { in: ["SUBMITTED", "ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS"] },
        quotes: { some: { status: "QUOTED" }, none: { status: "APPROVED" } },
      },
      select: {
        id: true,
        title: true,
        unit: { select: { unitNumber: true } },
        property: { select: { name: true } },
        quotes: {
          where: { status: "QUOTED" },
          select: { priceLowCents: true, priceHighCents: true },
        },
      },
    }),
  ]);

  const pulse: Pulse = {
    unitCount: units.length,
    occupiedCount: units.filter((u) => u.status === "OCCUPIED").length,
    marketRentTotalCents: units.reduce((s, u) => s + (u.marketRentCents ?? 0), 0),
    leaseRentTotalCents: leaseRent._sum.monthlyRentCents ?? 0,
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

  const quoteItems = buildQuoteItems(
    quoted.map((r) => ({
      requestId: r.id,
      title: r.title,
      unitNumber: r.unit?.unitNumber ?? null,
      propertyName: r.property.name,
      count: r.quotes.length,
      lowestCents: Math.min(
        ...r.quotes.map((q) => quoteCeilingCents(q.priceLowCents ?? 0, q.priceHighCents)),
      ),
    })),
  );

  const items = sortAttention([
    ...quoteItems,
    ...buildLateRentItems(lateRent),
    ...vacancyItems,
    ...(sample ? [buildSampleItem(sample)] : []),
  ]);

  return { pulse, setup, items, portfolio };
}
