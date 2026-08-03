/**
 * Measurements, not assertions about behavior: how many SQL queries the tick
 * actually issues, and whether the cross-org boundary actually holds when
 * attacked. Both are things the audit asserted and never measured.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateRentCharges, applyLateFees } from "@/lib/services/charges";
import { updateProperty, updatePropertyDetails, deleteProperty, getProperty, updateUnit } from "@/lib/services/property";
import { updateLease } from "@/lib/services/lease";
import { getTenantBilling } from "@/lib/services/charges";

const prisma = new PrismaClient();

/** Exact server-side statement count, via pg_stat_statements. */
async function serverCalls(): Promise<number> {
  const r = await prisma.$queryRawUnsafe<Array<{ n: bigint | null }>>(
    "SELECT COALESCE(SUM(calls),0)::bigint AS n FROM public.pg_stat_statements",
  );
  return Number(r[0]!.n ?? 0n);
}
async function resetStats(): Promise<void> {
  await prisma.$queryRawUnsafe("SELECT public.pg_stat_statements_reset()::text AS r");
}

let seq = 0;
const slug = (p: string) => `${p}-${++seq}-${Date.now()}`;

async function makeOrg(units: number, monthsOfCharges: number) {
  const org = await prisma.organization.create({ data: { name: slug("Org"), slug: slug("org") } });
  const property = await prisma.property.create({
    data: { orgId: org.id, name: "Bldg", type: "MULTIFAMILY", address1: "1 Main", city: "Chicago", state: "IL", zipCode: "60657" },
  });
  const leases: string[] = [];
  for (let u = 0; u < units; u++) {
    const unit = await prisma.unit.create({
      data: { orgId: org.id, propertyId: property.id, unitNumber: `U${u}`, status: "OCCUPIED" },
    });
    const lease = await prisma.lease.create({
      data: {
        orgId: org.id, unitId: unit.id, status: "ACTIVE",
        startDate: new Date(Date.UTC(2024, 0, 1)), endDate: new Date(Date.UTC(2028, 0, 1)),
        monthlyRentCents: 185000, rentDueDay: 1, lateFeeCents: 7500, lateFeeGraceDays: 5,
      },
    });
    leases.push(lease.id);
    for (let m = 0; m < monthsOfCharges; m++) {
      const d = new Date(Date.UTC(2024, m, 1));
      await prisma.charge.create({
        data: {
          leaseId: lease.id, orgId: org.id, type: "RENT",
          periodKey: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
          amountCents: 185000, description: "Rent", dueDate: d,
          // Fully paid: these should be irrelevant to the tick, but are not.
          status: "PAID", amountPaidCents: 185000,
        },
      });
    }
  }
  return { orgId: org.id, propertyId: property.id, leases };
}

beforeEach(async () => {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'villagekeep_app' AND tablename <> '_prisma_migrations'`;
  const list = rows.map((r) => `"villagekeep_app"."${r.tablename}"`).join(", ");
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
});

describe("MEASUREMENT: how many queries does one tick actually issue?", () => {
  it("scales with total historical charges, not with work to do", async () => {
    // Pilot-realistic: 10 landlords, 25 units each, 24 months of PAID history.
    for (let o = 0; o < 10; o++) await makeOrg(25, 24);
    const totalCharges = await prisma.charge.count();
    const totalLeases = await prisma.lease.count();

    const asOf = new Date(Date.UTC(2026, 7, 15));
    // First pass creates this month's rows. Measure the SECOND pass, which is
    // what 719 of the day's 720 ticks actually look like: zero work to do.
    await generateRentCharges(asOf);
    await applyLateFees(asOf);

    await resetStats();
    const base0 = await serverCalls();
    const t0 = Date.now();
    const rent = await generateRentCharges(asOf);
    const rentQ = (await serverCalls()) - base0 - 1;
    const mid = await serverCalls();
    const fees = await applyLateFees(asOf);
    const ms = Date.now() - t0;
    const totalQ = (await serverCalls()) - base0 - 3;
    void mid;

    console.log(`\n   fixture: ${totalLeases} active leases, ${totalCharges} charges (all PAID)`);
    console.log(`   generateRentCharges: ${rentQ} queries, created ${rent}`);
    console.log(`   applyLateFees:       ${totalQ - rentQ} queries, created ${fees}`);
    console.log(`   TOTAL PER TICK:      ${totalQ} queries in ${ms}ms to create ${rent + fees} rows`);
    console.log(`   at every 2 min:      ${(totalQ * 720).toLocaleString()} queries/day\n`);

    expect(rent + fees).toBe(0);                 // zero useful work
    expect(totalQ).toBeGreaterThan(totalLeases); // yet at least one query per lease
  }, 120000);
});

describe("SECURITY: does the cross-org boundary actually hold?", () => {
  it("org B cannot mutate org A's property, unit, or lease", async () => {
    const a = await makeOrg(1, 0);
    const b = await makeOrg(1, 0);
    const ctxB = { userId: "attacker-user", orgId: b.orgId };
    const results: Record<string, string> = {};

    const tryIt = async (name: string, fn: () => Promise<unknown>) => {
      try { await fn(); results[name] = "!!! SUCCEEDED (LEAK)"; }
      catch (e) { results[name] = `blocked (${(e as Error).constructor.name})`; }
    };

    await tryIt("getProperty(A)", () => getProperty(ctxB, a.propertyId));
    await tryIt("updateProperty(A)", () => updateProperty(ctxB, a.propertyId, { name: "PWNED" } as never));
    await tryIt("updatePropertyDetails(A)", () => updatePropertyDetails(ctxB, a.propertyId, { notes: "PWNED" } as never));
    await tryIt("deleteProperty(A)", () => deleteProperty(ctxB, a.propertyId));
    const aUnit = await prisma.unit.findFirstOrThrow({ where: { propertyId: a.propertyId } });
    await tryIt("updateUnit(A)", () => updateUnit(ctxB, aUnit.id, { unitNumber: "PWNED" } as never));
    await tryIt("updateLease(A)", () => updateLease(ctxB, a.leases[0]!, { monthlyRentDollars: 1 } as never));

    console.log("\n   cross-org attack results:");
    for (const [k, v] of Object.entries(results)) console.log(`     ${k.padEnd(28)} ${v}`);

    const stillNamed = await prisma.property.findUniqueOrThrow({ where: { id: a.propertyId } });
    console.log(`   org A property name after attacks: "${stillNamed.name}"\n`);

    expect(Object.values(results).every((v) => v.startsWith("blocked"))).toBe(true);
    expect(stillNamed.name).not.toBe("PWNED");
  });

  it("getTenantBilling has NO ownership check: any leaseId returns its charges", async () => {
    const a = await makeOrg(1, 0);
    await prisma.charge.create({
      data: { leaseId: a.leases[0]!, orgId: a.orgId, type: "RENT", periodKey: "2026-08",
              amountCents: 185000, description: "Rent", dueDate: new Date(Date.UTC(2026, 7, 1)) },
    });
    // No ctx, no userId, no org. Just a lease id.
    const billing = await getTenantBilling(a.leases[0]!);
    console.log(`\n   getTenantBilling("${a.leases[0]!.slice(0, 12)}...") with NO auth context`);
    console.log(`     -> balance $${(billing.summary.balanceCents / 100).toFixed(2)}, ${billing.charges.length} charge(s)\n`);
    expect(billing.summary.balanceCents).toBe(185000); // it just answers
  });
});
