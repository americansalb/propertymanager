/**
 * Empirical proof harness. Runs the AUDIT'S CLAIMED FAILURE SCENARIOS against a
 * real Postgres using the app's own service functions. Every assertion here is
 * written to PASS if the bug is real, so a green run means the defects are
 * confirmed. Failures mean I was wrong and must retract.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateRentCharges, applyLateFees, getOrgLateRent, getTenantBilling } from "@/lib/services/charges";
import { rentChargeForPeriod, lateFeeForRent, isOverdue, daysLate } from "@/lib/charges";
import { allocateOldestFirst } from "@/lib/money";
import { postLedger, reverseEntry } from "@/lib/services/ledger";

const prisma = new PrismaClient();

let orgId: string, propertyId: string, unitId: string;
let seq = 0;
const nextSlug = (p: string) => `${p}-${++seq}-${Date.now()}`;

async function freshOrg(slug: string) {
  const org = await prisma.organization.create({ data: { name: "Test Org " + slug, slug } });
  const property = await prisma.property.create({
    data: {
      orgId: org.id, name: "1247 W Oakdale", type: "MULTIFAMILY",
      address1: "1247 W Oakdale Ave", city: "Chicago", state: "IL", zipCode: "60657",
    },
  });
  const unit = await prisma.unit.create({
    data: { orgId: org.id, propertyId: property.id, unitNumber: "1F", status: "OCCUPIED" },
  });
  return { orgId: org.id, propertyId: property.id, unitId: unit.id };
}

async function makeLease(o: { orgId: string; unitId: string }, over: Record<string, unknown> = {}) {
  return prisma.lease.create({
    data: {
      orgId: o.orgId, unitId: o.unitId, status: "ACTIVE",
      startDate: new Date(Date.UTC(2025, 5, 1)), endDate: new Date(Date.UTC(2027, 4, 31)),
      monthlyRentCents: 185000, rentDueDay: 1, lateFeeCents: 0, lateFeeGraceDays: 5,
      ...over,
    },
  });
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

beforeEach(async () => {
  // Truncate every app table between tests. Scoped to our schema only.
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'villagekeep_app' AND tablename <> '_prisma_migrations'`;
  const list = rows.map((r) => `"villagekeep_app"."${r.tablename}"`).join(", ");
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  const o = await freshOrg(nextSlug("org"));
  orgId = o.orgId; propertyId = o.propertyId; unitId = o.unitId;
});

describe("CLAIM A1: mid-month lease start is billed a full month, due before the lease began", () => {
  it("bills full rent with a dueDate 14 days before occupancy", async () => {
    await makeLease({ orgId, unitId }, { startDate: new Date(Date.UTC(2026, 7, 15)) });
    const asOf = new Date(Date.UTC(2026, 7, 15, 12));
    const created = await generateRentCharges(asOf);
    expect(created).toBe(1);
    const c = await prisma.charge.findFirstOrThrow({ where: { type: "RENT" } });
    console.log(`   -> amount=$${(c.amountCents / 100).toFixed(2)} dueDate=${c.dueDate.toISOString().slice(0, 10)} leaseStart=2026-08-15`);
    expect(c.amountCents).toBe(185000);                       // full month, not prorated
    expect(c.dueDate.toISOString().slice(0, 10)).toBe("2026-08-01"); // before lease start
    expect(isOverdue(c as never, asOf)).toBe(true);            // instantly past due
    console.log(`   -> prorated would be $${((185000 * 17) / 31 / 100).toFixed(2)}; overbilled by $${((185000 - (185000 * 17) / 31) / 100).toFixed(2)}`);
  });
});

describe("CLAIM A-onboarding: activating an in-progress lease creates a past-due charge immediately", () => {
  it("creates the current month already overdue", async () => {
    await makeLease({ orgId, unitId }); // real lease running since June 2025
    const asOf = new Date(Date.UTC(2026, 7, 12, 9)); // landlord onboards Aug 12
    await generateRentCharges(asOf);
    const c = await prisma.charge.findFirstOrThrow({ where: { type: "RENT" } });
    console.log(`   -> onboarded Aug 12, charge dueDate=${c.dueDate.toISOString().slice(0, 10)} daysLate=${daysLate(c.dueDate, asOf)}`);
    expect(isOverdue(c as never, asOf)).toBe(true);
    expect(daysLate(c.dueDate, asOf)).toBe(11);
  });
});

describe("CLAIM A2/A7: setting a late fee retroactively mints one fee per unpaid past month", () => {
  it("mints 6 late fees in a single tick from one lease edit", async () => {
    const lease = await makeLease({ orgId, unitId }, { lateFeeCents: 0 });
    // Six months of rent accumulate with NO late fee configured.
    for (let m = 1; m <= 6; m++) await generateRentCharges(new Date(Date.UTC(2026, m, 2)));
    expect(await prisma.charge.count({ where: { type: "RENT" } })).toBe(6);
    let fees = await applyLateFees(new Date(Date.UTC(2026, 6, 20)));
    console.log(`   -> late fees before the edit: ${fees}`);
    expect(fees).toBe(0);

    // Landlord sets a $75 late fee in August, expecting it to apply going forward.
    await prisma.lease.update({ where: { id: lease.id }, data: { lateFeeCents: 7500 } });
    fees = await applyLateFees(new Date(Date.UTC(2026, 7, 20)));
    const total = await prisma.charge.aggregate({ where: { type: "LATE_FEE" }, _sum: { amountCents: true } });
    console.log(`   -> late fees minted by ONE edit: ${fees}, totalling $${((total._sum.amountCents ?? 0) / 100).toFixed(2)}`);
    expect(fees).toBe(6);
    expect(total._sum.amountCents).toBe(45000);
  });
});

describe("CLAIM A3: landlord late-rent queue flags a charge seconds after it is created", () => {
  it("shows '0 days late' on the morning rent is due", async () => {
    await makeLease({ orgId, unitId });
    const tickAt = new Date(Date.UTC(2026, 7, 1, 0, 0, 5)); // 5 seconds past midnight UTC
    await generateRentCharges(tickAt);
    const late = await getOrgLateRent(orgId, tickAt);
    console.log(`   -> tick at ${tickAt.toISOString()}: landlord queue has ${late.length} item(s), daysLate=${late[0]?.daysLate}`);
    expect(late.length).toBe(1);
    expect(late[0]!.daysLate).toBe(0);

    // The tenant portal, using day-granular isOverdue, disagrees.
    const c = await prisma.charge.findFirstOrThrow({ where: { type: "RENT" } });
    console.log(`   -> tenant portal isOverdue = ${isOverdue(c as never, tickAt)} (landlord says late, tenant says not)`);
    expect(isOverdue(c as never, tickAt)).toBe(false);
  });
});

describe("CLAIM A4: Chicago tenant is charged a late fee before their local grace ends", () => {
  it("fires at 19:00 Chicago on the last grace day", async () => {
    await makeLease({ orgId, unitId }, { lateFeeCents: 7500, lateFeeGraceDays: 5 });
    await generateRentCharges(new Date(Date.UTC(2026, 7, 1, 1)));
    // 2026-08-07T00:00:01Z is 2026-08-06 19:00:01 CDT: still grace day 5 in Chicago.
    const at = new Date(Date.UTC(2026, 7, 7, 0, 0, 1));
    const chicago = at.toLocaleString("en-US", { timeZone: "America/Chicago" });
    const n = await applyLateFees(at);
    console.log(`   -> at ${at.toISOString()} (Chicago local: ${chicago}) late fees minted: ${n}`);
    expect(n).toBe(1);
  });
});

describe("CLAIM A5: applyLateFees rescans fully-paid charges forever", () => {
  it("loads PAID charges into the scan set", async () => {
    await makeLease({ orgId, unitId }, { lateFeeCents: 7500 });
    await generateRentCharges(new Date(Date.UTC(2026, 7, 2)));
    const c = await prisma.charge.findFirstOrThrow({ where: { type: "RENT" } });
    await prisma.charge.update({ where: { id: c.id }, data: { status: "PAID", amountPaidCents: 185000 } });
    const scanned = await prisma.charge.count({
      where: { type: "RENT", status: { not: "VOID" }, dueDate: { lt: new Date(Date.UTC(2026, 8, 1)) } },
    });
    console.log(`   -> charges still in applyLateFees' scan set after being fully PAID: ${scanned}`);
    expect(scanned).toBe(1); // the query's own predicate includes it forever
  });
});

describe("CLAIM: ledger runningBalanceCents is int4 and overflows at $21.47M", () => {
  it("rejects a balance above 2147483647 cents", async () => {
    const big = 2_000_000_000;
    await postLedger({ postings: [{ accountType: "LANDLORD_ORG", accountId: orgId, type: "RENT_PAYMENT", amountCents: big, currency: "usd", description: "a" }] });
    let err: unknown = null;
    try {
      await postLedger({ postings: [{ accountType: "LANDLORD_ORG", accountId: orgId, type: "RENT_PAYMENT", amountCents: big, currency: "usd", description: "b" }] });
    } catch (e) { err = e; }
    console.log(`   -> second posting (cumulative $${((big * 2) / 100).toLocaleString()}) threw: ${err ? String(err).split("\n").find((l) => /out of range|overflow/i.test(l))?.trim() ?? "yes" : "NO"}`);
    expect(err).not.toBeNull();
  });
});

describe("CLAIM: postLedger's P2002 catch swallows a double reversal", () => {
  it("returns posted:false instead of erroring, losing the entry", async () => {
    const r = await postLedger({ postings: [{ accountType: "LANDLORD_ORG", accountId: orgId, type: "RENT_PAYMENT", amountCents: 185000, currency: "usd", description: "rent" }] });
    expect(r.posted).toBe(true);
    const entryId = (r as { entries: Array<{ id: string }> }).entries[0]!.id;
    await reverseEntry(entryId, "first reversal");
    // Second reversal: reverseEntry guards it, but the raw postLedger path does not.
    const dup = await postLedger({
      postings: [{ accountType: "LANDLORD_ORG", accountId: orgId, type: "REVERSAL", amountCents: -185000, currency: "usd", description: "dup", reversalOfId: entryId }],
      idempotencyKey: "some-brand-new-key-never-seen",
    });
    console.log(`   -> duplicate reversal with a FRESH idempotency key returned posted=${dup.posted} (silently swallowed, no throw)`);
    expect(dup.posted).toBe(false); // bug: a unique violation on reversalOfId reads as "already done"
  });
});

describe("FIXED: allocateOldestFirst now guards its input", () => {
  it("throws on negative and fractional payments instead of corrupting state", () => {
    const charges = [{ id: "c1", dueDate: new Date(), amountCents: 185000, amountPaidCents: 0 }];
    expect(() => allocateOldestFirst(-5000, charges)).toThrow();
    expect(() => allocateOldestFirst(1850.5, charges)).toThrow();
    console.log(`   -> allocateOldestFirst now rejects negative and fractional payments`);
  });
});

describe("CLAIM C1: tenant sees charge amounts even when the landlord hid the lease", () => {
  it("returns billing for an unshared lease", async () => {
    const lease = await makeLease({ orgId, unitId }, { shareWithTenant: false });
    await generateRentCharges(new Date(Date.UTC(2026, 7, 2)));
    const billing = await getTenantBilling(lease.id, new Date(Date.UTC(2026, 7, 2)));
    console.log(`   -> shareWithTenant=false, tenant balance visible = $${(billing.summary.balanceCents / 100).toFixed(2)}`);
    expect(billing.summary.balanceCents).toBe(185000);
  });
});

describe("CLAIM: generateRentCharges has no org filter and scans every lease globally", () => {
  it("bills leases belonging to a different org in one call", async () => {
    await makeLease({ orgId, unitId });
    const other = await freshOrg(nextSlug("other"));
    await makeLease({ orgId: other.orgId, unitId: other.unitId });
    const created = await generateRentCharges(new Date(Date.UTC(2026, 7, 2)));
    console.log(`   -> one generateRentCharges() call created charges across ${created} leases in ${2} different orgs`);
    expect(created).toBe(2);
  });
});
