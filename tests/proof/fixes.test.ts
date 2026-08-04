/**
 * Prove-the-FIX. Where prove.test.ts asserts a bug is present, these assert the
 * fix works end to end against a real Postgres. When a fix ships, its bug proof
 * flips here.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getDashboard } from "@/lib/services/dashboard";

const prisma = new PrismaClient();
let seq = 0;
const slug = (p: string) => `${p}-${++seq}-${Date.now()}`;

async function org() {
  const o = await prisma.organization.create({ data: { name: slug("O"), slug: slug("o") } });
  const p = await prisma.property.create({ data: { orgId: o.id, name: "Oakdale Duplex", type: "MULTIFAMILY", address1: "1247 W Oakdale", city: "Chicago", state: "IL", zipCode: "60657" } });
  const u = await prisma.unit.create({ data: { orgId: o.id, propertyId: p.id, unitNumber: "2F", status: "OCCUPIED" } });
  const user = await prisma.user.create({ data: { email: slug("t") + "@x.test", firstName: "Tom", lastName: "Tenant" } });
  return { orgId: o.id, propertyId: p.id, unitId: u.id, userId: user.id };
}

beforeEach(async () => {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='villagekeep_app' AND tablename<>'_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"villagekeep_app"."${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
});

describe("FIX 1.3: an open EMERGENCY now appears in the landlord attention queue", () => {
  it("surfaces the emergency as the top NEEDS YOU item", async () => {
    const o = await org();
    await prisma.maintenanceRequest.create({
      data: { orgId: o.orgId, propertyId: o.propertyId, unitId: o.unitId, createdByUserId: o.userId,
        origin: "TENANT", category: "PLUMBING", title: "No hot water, water through the ceiling",
        description: "dripping", urgency: "EMERGENCY", status: "SUBMITTED", permissionToEnter: true },
    });
    const dash = await getDashboard({ userId: o.userId, orgId: o.orgId });
    const top = dash.items[0];
    console.log(`   -> pulse openMaintenance=${dash.pulse.openMaintenance}; top item kind=${top?.kind} cls=${top?.cls}`);
    console.log(`   -> "${top?.title}"`);
    expect(dash.items.some((i) => i.kind === "maintenance")).toBe(true);
    expect(top?.kind).toBe("maintenance");
    expect(top?.cls).toBe("EMERGENCY");
    expect(top?.action.href).toBe(`/landlord/maintenance/${dash.items[0]!.refId}`);
  });

  it("does NOT surface work already scheduled or in progress", async () => {
    const o = await org();
    await prisma.maintenanceRequest.create({
      data: { orgId: o.orgId, propertyId: o.propertyId, unitId: o.unitId, createdByUserId: o.userId,
        origin: "TENANT", category: "PLUMBING", title: "Being handled", description: "d",
        urgency: "URGENT", status: "IN_PROGRESS", permissionToEnter: true },
    });
    const dash = await getDashboard({ userId: o.userId, orgId: o.orgId });
    expect(dash.items.some((i) => i.kind === "maintenance")).toBe(false);
  });
});
