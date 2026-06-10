import { PrismaClient, Trade } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";

// Seed runs inside the app's isolated schema only (DATABASE_URL?schema=…).
const url = new URL(process.env.DATABASE_URL ?? "");
if (!url.searchParams.has("schema")) {
  url.searchParams.set("schema", process.env.APP_DB_SCHEMA ?? "villagemembers_app");
}
const prisma = new PrismaClient({ datasourceUrl: url.toString() });

type CatalogSeed = {
  trade: Trade;
  name: string;
  low: number; // dollars
  high: number;
  minutes: number;
  unit?: "FLAT" | "HOURLY" | "QUOTE";
  license?: boolean;
};

// Launch trades × ~10 items, Chicago-region typical ranges
// (price-transparency concept ported from the archived catalog).
const CATALOG: CatalogSeed[] = [
  // Plumbing
  { trade: "PLUMBING", name: "Faucet repair or replacement", low: 95, high: 240, minutes: 75 },
  { trade: "PLUMBING", name: "Toilet replacement", low: 180, high: 320, minutes: 90 },
  { trade: "PLUMBING", name: "Running toilet repair", low: 85, high: 185, minutes: 60 },
  { trade: "PLUMBING", name: "Drain clog clearing", low: 109, high: 250, minutes: 75 },
  { trade: "PLUMBING", name: "Garbage disposal install", low: 135, high: 260, minutes: 75 },
  { trade: "PLUMBING", name: "Water heater replacement (40-50 gal)", low: 950, high: 1900, minutes: 240 },
  { trade: "PLUMBING", name: "Leak detection & repair", low: 150, high: 450, minutes: 120, unit: "QUOTE" },
  { trade: "PLUMBING", name: "Sump pump replacement", low: 280, high: 650, minutes: 150 },
  { trade: "PLUMBING", name: "Shower valve replacement", low: 225, high: 575, minutes: 150 },
  { trade: "PLUMBING", name: "Hose bib / outdoor spigot replacement", low: 120, high: 280, minutes: 90 },
  // Electrical
  { trade: "ELECTRICAL", name: "Outlet or switch replacement", low: 85, high: 165, minutes: 45 },
  { trade: "ELECTRICAL", name: "GFCI outlet install", low: 110, high: 210, minutes: 60 },
  { trade: "ELECTRICAL", name: "Ceiling fan install (existing wiring)", low: 130, high: 260, minutes: 90 },
  { trade: "ELECTRICAL", name: "Light fixture replacement", low: 95, high: 220, minutes: 60 },
  { trade: "ELECTRICAL", name: "Circuit breaker replacement", low: 140, high: 300, minutes: 90 },
  { trade: "ELECTRICAL", name: "Electrical panel inspection", low: 89, high: 165, minutes: 60 },
  { trade: "ELECTRICAL", name: "Smoke/CO detector install (hardwired)", low: 95, high: 190, minutes: 45 },
  { trade: "ELECTRICAL", name: "EV charger install (Level 2)", low: 550, high: 1400, minutes: 240, unit: "QUOTE" },
  { trade: "ELECTRICAL", name: "Troubleshoot dead outlets/circuit", low: 120, high: 280, minutes: 90, unit: "HOURLY" },
  { trade: "ELECTRICAL", name: "Bathroom exhaust fan replacement", low: 165, high: 380, minutes: 120 },
  // Handyman
  { trade: "HANDYMAN", name: "Drywall patch & paint (small)", low: 110, high: 270, minutes: 120, license: false },
  { trade: "HANDYMAN", name: "Interior door replacement", low: 150, high: 340, minutes: 120, license: false },
  { trade: "HANDYMAN", name: "Door lock replacement / rekey", low: 80, high: 160, minutes: 45, license: false },
  { trade: "HANDYMAN", name: "Caulking (tub/shower/kitchen)", low: 90, high: 190, minutes: 90, license: false },
  { trade: "HANDYMAN", name: "TV mount install", low: 95, high: 200, minutes: 75, license: false },
  { trade: "HANDYMAN", name: "Appliance install (dishwasher/OTR microwave)", low: 140, high: 320, minutes: 120, license: false },
  { trade: "HANDYMAN", name: "Weatherstripping & door sweep", low: 75, high: 160, minutes: 60, license: false },
  { trade: "HANDYMAN", name: "Window blind/shade install", low: 85, high: 180, minutes: 60, license: false },
  { trade: "HANDYMAN", name: "Gutter cleaning (single family)", low: 120, high: 240, minutes: 120, license: false },
  { trade: "HANDYMAN", name: "General punch list (hourly)", low: 75, high: 125, minutes: 60, unit: "HOURLY", license: false },
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  // ── Super admin ────────────────────────────────────────────────────────
  const adminEmail = process.env.SUPER_ADMIN_EMAIL ?? "jobs@aalb.org";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || randomBytes(12).toString("base64url");
  const passwordHash = await hash(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isSuperAdmin: true },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      isSuperAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });
  if (!process.env.SUPER_ADMIN_PASSWORD) {
    console.log(`Super admin: ${adminEmail}  (generated password: ${adminPassword})`);
  } else {
    console.log(`Super admin: ${adminEmail}`);
  }

  // ── Service catalog ────────────────────────────────────────────────────
  for (const item of CATALOG) {
    const slug = `${item.trade.toLowerCase()}-${slugify(item.name)}`;
    await prisma.serviceCatalogItem.upsert({
      where: { slug },
      update: {
        typicalLowCents: item.low * 100,
        typicalHighCents: item.high * 100,
        typicalDurationMin: item.minutes,
      },
      create: {
        trade: item.trade,
        name: item.name,
        slug,
        region: "CHICAGO_IL",
        pricingUnit: item.unit ?? "FLAT",
        typicalLowCents: item.low * 100,
        typicalHighCents: item.high * 100,
        typicalDurationMin: item.minutes,
        requiresLicense: item.license ?? true,
      },
    });
  }
  console.log(`Service catalog: ${CATALOG.length} items (CHICAGO_IL)`);

  // ── Demo data (opt-in) ─────────────────────────────────────────────────
  if (process.env.SEED_DEMO === "true") {
    const demoPassword = await hash("Demo1234!");

    const landlord = await prisma.user.upsert({
      where: { email: "landlord@demo.test" },
      update: {},
      create: {
        email: "landlord@demo.test",
        passwordHash: demoPassword,
        firstName: "Dana",
        lastName: "Landlord",
        emailVerifiedAt: new Date(),
      },
    });
    const org = await prisma.organization.upsert({
      where: { slug: "demo-properties" },
      update: {},
      create: { name: "Demo Properties LLC", slug: "demo-properties" },
    });
    await prisma.membership.upsert({
      where: { userId_orgId: { userId: landlord.id, orgId: org.id } },
      update: {},
      create: { userId: landlord.id, orgId: org.id, role: "OWNER" },
    });

    let property = await prisma.property.findFirst({ where: { orgId: org.id } });
    property ??= await prisma.property.create({
      data: {
        orgId: org.id,
        name: "Oakdale Duplex",
        type: "MULTIFAMILY",
        address1: "1247 W Oakdale Ave",
        city: "Chicago",
        state: "IL",
        zipCode: "60657",
        units: {
          create: [
            { orgId: org.id, unitNumber: "1F", bedrooms: 2, marketRentCents: 185_000, status: "OCCUPIED" },
            { orgId: org.id, unitNumber: "2F", bedrooms: 2, marketRentCents: 192_500, status: "VACANT" },
          ],
        },
      },
    });

    const unit1 = await prisma.unit.findFirstOrThrow({
      where: { propertyId: property.id, unitNumber: "1F" },
    });

    const tenant = await prisma.user.upsert({
      where: { email: "tenant@demo.test" },
      update: {},
      create: {
        email: "tenant@demo.test",
        passwordHash: demoPassword,
        firstName: "Tom",
        lastName: "Tenant",
        emailVerifiedAt: new Date(),
        tenantProfile: { create: {} },
      },
    });
    const tenantProfile = await prisma.tenantProfile.findUniqueOrThrow({
      where: { userId: tenant.id },
    });

    let lease = await prisma.lease.findFirst({ where: { unitId: unit1.id, status: "ACTIVE" } });
    lease ??= await prisma.lease.create({
      data: {
        unitId: unit1.id,
        orgId: org.id,
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        monthlyRentCents: 185_000,
        securityDepositCents: 185_000,
        tenants: { create: { tenantProfileId: tenantProfile.id, isPrimary: true } },
      },
    });

    const pro = await prisma.user.upsert({
      where: { email: "pro@demo.test" },
      update: {},
      create: {
        email: "pro@demo.test",
        passwordHash: demoPassword,
        firstName: "Pat",
        lastName: "Plumber",
        emailVerifiedAt: new Date(),
        proProfile: {
          create: {
            businessName: "Smith Plumbing Co",
            phone: "312-555-0142",
            city: "Chicago",
            state: "IL",
            zipCode: "60657",
            status: "ACTIVE",
            areas: { create: [{ zipCode: "60657" }, { zipCode: "60614" }, { zipCode: "60613" }] },
          },
        },
      },
    });

    console.log(`Demo data: org=${org.slug}, lease=${lease.id}, pro=${pro.email} (password: Demo1234!)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
