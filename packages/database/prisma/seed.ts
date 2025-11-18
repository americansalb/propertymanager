import { PrismaClient, UserRole, OrganizationType, SubscriptionPlan, PropertyType, PropertyStatus, UnitType, UnitStatus, AccountType, AccountSubType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🧹 Clearing existing seed data...');
  await prisma.bankAccount.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.chartOfAccounts.deleteMany({});
  await prisma.user.deleteMany({ where: { email: 'contact@aalb.org' } });
  await prisma.organization.deleteMany({ where: { slug: 'demo-pm' } });

  // Create demo organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Demo Property Management Co.',
      slug: 'demo-pm',
      type: OrganizationType.PROPERTY_MANAGER,
      plan: SubscriptionPlan.PROFESSIONAL,
      settings: {},
    },
  });

  console.log('✅ Created organization:', organization.name);

  // Create admin user
  const passwordHash = await bcrypt.hash('retard', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'contact@aalb.org',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1-555-0100',
      role: UserRole.PLATFORM_ADMIN,
      emailVerified: true,
      organizationId: organization.id,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create Chart of Accounts
  const chartOfAccounts = await prisma.chartOfAccounts.createMany({
    data: [
      // Assets
      { organizationId: organization.id, accountNumber: '1000', name: 'Operating Cash', type: AccountType.ASSET, subType: AccountSubType.CASH },
      { organizationId: organization.id, accountNumber: '1100', name: 'Trust Account Cash', type: AccountType.ASSET, subType: AccountSubType.CASH },
      { organizationId: organization.id, accountNumber: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, subType: AccountSubType.ACCOUNTS_RECEIVABLE },
      { organizationId: organization.id, accountNumber: '1300', name: 'Security Deposits Held', type: AccountType.ASSET, subType: AccountSubType.SECURITY_DEPOSITS_HELD },

      // Liabilities
      { organizationId: organization.id, accountNumber: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, subType: AccountSubType.ACCOUNTS_PAYABLE },
      { organizationId: organization.id, accountNumber: '2100', name: 'Security Deposits Liability', type: AccountType.LIABILITY, subType: AccountSubType.SECURITY_DEPOSITS_LIABILITY },

      // Equity
      { organizationId: organization.id, accountNumber: '3000', name: 'Owner Equity', type: AccountType.EQUITY, subType: AccountSubType.OWNER_EQUITY },

      // Revenue
      { organizationId: organization.id, accountNumber: '4000', name: 'Rental Income', type: AccountType.REVENUE, subType: AccountSubType.RENTAL_INCOME },
      { organizationId: organization.id, accountNumber: '4100', name: 'Late Fees', type: AccountType.REVENUE, subType: AccountSubType.LATE_FEES },
      { organizationId: organization.id, accountNumber: '4200', name: 'Parking Income', type: AccountType.REVENUE, subType: AccountSubType.PARKING_INCOME },

      // Expenses
      { organizationId: organization.id, accountNumber: '5000', name: 'Maintenance & Repairs', type: AccountType.EXPENSE, subType: AccountSubType.MAINTENANCE },
      { organizationId: organization.id, accountNumber: '5100', name: 'Utilities', type: AccountType.EXPENSE, subType: AccountSubType.UTILITIES },
      { organizationId: organization.id, accountNumber: '5200', name: 'Insurance', type: AccountType.EXPENSE, subType: AccountSubType.INSURANCE },
      { organizationId: organization.id, accountNumber: '5300', name: 'Property Tax', type: AccountType.EXPENSE, subType: AccountSubType.PROPERTY_TAX },
    ],
  });

  console.log('✅ Created Chart of Accounts');

  // Create demo property
  const property = await prisma.property.create({
    data: {
      name: 'Sunset Gardens Apartments',
      type: PropertyType.MULTIFAMILY,
      status: PropertyStatus.ACTIVE,
      address1: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US',
      yearBuilt: 2015,
      totalUnits: 24,
      squareFeet: 32000,
      organizationId: organization.id,
    },
  });

  console.log('✅ Created property:', property.name);

  // Create demo units
  const units = [];
  for (let i = 1; i <= 24; i++) {
    const floor = Math.ceil(i / 6);
    const unitNumber = `${floor}0${((i - 1) % 6) + 1}`;
    const type = i % 3 === 0 ? UnitType.TWO_BED : i % 2 === 0 ? UnitType.ONE_BED : UnitType.STUDIO;
    const bedrooms = type === UnitType.STUDIO ? 0 : type === UnitType.ONE_BED ? 1 : 2;
    const bathrooms = type === UnitType.STUDIO ? 1 : type === UnitType.ONE_BED ? 1 : 2;
    const sqft = type === UnitType.STUDIO ? 500 : type === UnitType.ONE_BED ? 750 : 1100;
    const marketRent = type === UnitType.STUDIO ? 1800 : type === UnitType.ONE_BED ? 2400 : 3200;

    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber,
        floor,
        type,
        status: i <= 20 ? UnitStatus.OCCUPIED : UnitStatus.VACANT,
        bedrooms,
        bathrooms,
        squareFeet: sqft,
        marketRent,
      },
    });

    units.push(unit);
  }

  console.log(`✅ Created ${units.length} units`);

  // Create demo vendor
  const vendor = await prisma.vendor.create({
    data: {
      companyName: 'Quick Fix Maintenance',
      contactName: 'John Doe',
      email: 'john@quickfix.com',
      phone: '+1-555-0200',
      type: 'MAINTENANCE',
      status: 'ACTIVE',
      address1: '456 Service Road',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      paymentTerms: 'Net 30',
      organizationId: organization.id,
      properties: {
        create: {
          propertyId: property.id,
          isPreferred: true,
        },
      },
    },
  });

  console.log('✅ Created vendor:', vendor.companyName);

  // Create bank account
  const bankAccount = await prisma.bankAccount.create({
    data: {
      accountName: 'Operating Account',
      accountType: 'CHECKING',
      bankName: 'Chase Bank',
      accountNumber: '****1234',
      currentBalance: 125000,
      organizationId: organization.id,
    },
  });

  console.log('✅ Created bank account:', bankAccount.accountName);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: contact@aalb.org');
  console.log('   Password: retard');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
