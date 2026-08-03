import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateRentCharges, applyLateFees } from "@/lib/services/charges";

const prisma = new PrismaClient();
const calls = async () => Number((await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
  "SELECT COALESCE(SUM(calls),0)::bigint AS n FROM public.pg_stat_statements"))[0]!.n);
const reset = () => prisma.$queryRawUnsafe("SELECT public.pg_stat_statements_reset()::text AS r");

let seq = 0;
async function build(units: number, months: number, paid: boolean) {
  const org = await prisma.organization.create({ data: { name: `O${++seq}`, slug: `o-${seq}-${Date.now()}` } });
  const p = await prisma.property.create({ data: { orgId: org.id, name: "B", type: "MULTIFAMILY", address1: "1", city: "Chicago", state: "IL", zipCode: "60657" } });
  for (let u = 0; u < units; u++) {
    const unit = await prisma.unit.create({ data: { orgId: org.id, propertyId: p.id, unitNumber: `U${u}`, status: "OCCUPIED" } });
    const l = await prisma.lease.create({ data: { orgId: org.id, unitId: unit.id, status: "ACTIVE",
      startDate: new Date(Date.UTC(2022, 0, 1)), endDate: new Date(Date.UTC(2030, 0, 1)),
      monthlyRentCents: 185000, rentDueDay: 1, lateFeeCents: 7500, lateFeeGraceDays: 5 } });
    await prisma.charge.createMany({ data: Array.from({ length: months }, (_, m) => {
      const d = new Date(Date.UTC(2022 + Math.floor(m / 12), m % 12, 1));
      return { leaseId: l.id, orgId: org.id, type: "RENT" as const,
        periodKey: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        amountCents: 185000, description: "Rent", dueDate: d,
        status: paid ? ("PAID" as const) : ("PENDING" as const), amountPaidCents: paid ? 185000 : 0 };
    }) });
  }
}

beforeEach(async () => {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='villagekeep_app' AND tablename<>'_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${rows.map(r => `"villagekeep_app"."${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
});

describe("SCALING: tick cost vs unpaid history", () => {
  for (const months of [12, 24, 36]) {
    it(`10 orgs x 25 units x ${months} months UNPAID`, async () => {
      for (let o = 0; o < 10; o++) await build(25, months, false);
      const asOf = new Date(Date.UTC(2026, 7, 15));
      await generateRentCharges(asOf); await applyLateFees(asOf); // warm
      await reset(); const b = await calls();
      await generateRentCharges(asOf); await applyLateFees(asOf);
      const q = (await calls()) - b - 2;
      const charges = await prisma.charge.count();
      console.log(`   ${months}mo unpaid: ${charges} charges -> ${q} queries/tick -> ${(q*720).toLocaleString()}/day`);
      expect(q).toBeGreaterThan(0);
    }, 300000);
  }
});
