import {
  PrismaClient,
  TenantStatus,
  TenantInvitationStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('📋 Creating platform admin, test landlord, and test tenant\n');

  // Get passwords from env vars or use defaults for development
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@propertymaster.io';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const landlordEmail = process.env.TEST_LANDLORD_EMAIL || 'landlord@aalb.org';
  const landlordPassword = process.env.TEST_LANDLORD_PASSWORD || 'Landlord123!';
  const tenantEmail = process.env.TEST_TENANT_EMAIL || 'tenant@aalb.org';
  const tenantPassword = process.env.TEST_TENANT_PASSWORD || 'Tenant123!';

  // ============================================================
  // 1. CREATE SUPER ADMIN (Platform/Dev Account)
  // ============================================================
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 12);

  // Create or get platform organization
  let platformOrg = await prisma.organization.findFirst({
    where: { slug: 'propertymaster-platform' }
  });

  if (!platformOrg) {
    platformOrg = await prisma.organization.create({
      data: {
        name: 'PropertyMaster Platform',
        slug: 'propertymaster-platform',
        type: 'ENTERPRISE',
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
      },
    });
    console.log('✅ Created platform organization');
  }

  // Create or update super admin
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail }
  });

  if (existingSuperAdmin) {
    await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        passwordHash: superAdminPasswordHash,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
    console.log('✅ Updated SUPER_ADMIN:', superAdminEmail);
  } else {
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: superAdminPasswordHash,
        firstName: 'Platform',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        organizationId: platformOrg.id,
      },
    });
    console.log('✅ Created SUPER_ADMIN:', superAdminEmail);
  }

  // ============================================================
  // 2. CREATE TEST LANDLORD (Organization Admin)
  // ============================================================
  const landlordPasswordHash = await bcrypt.hash(landlordPassword, 12);

  // Create or get test landlord organization
  let landlordOrg = await prisma.organization.findFirst({
    where: { slug: 'aalb-properties' }
  });

  if (!landlordOrg) {
    landlordOrg = await prisma.organization.create({
      data: {
        name: 'AALB Properties',
        slug: 'aalb-properties',
        type: 'PROPERTY_MANAGER',
        subscriptionPlan: 'PROFESSIONAL',
        subscriptionStatus: 'ACTIVE',
      },
    });
    console.log('✅ Created landlord organization: AALB Properties');
  }

  // Create or update landlord
  const existingLandlord = await prisma.user.findUnique({
    where: { email: landlordEmail }
  });

  if (existingLandlord) {
    await prisma.user.update({
      where: { id: existingLandlord.id },
      data: {
        passwordHash: landlordPasswordHash,
        role: UserRole.ORGANIZATION_ADMIN,
        status: UserStatus.ACTIVE,
        lockedUntil: null,
        failedLoginAttempts: 0,
        organizationId: landlordOrg.id,
      },
    });
    console.log('✅ Updated LANDLORD:', landlordEmail);
  } else {
    await prisma.user.create({
      data: {
        email: landlordEmail,
        passwordHash: landlordPasswordHash,
        firstName: 'Test',
        lastName: 'Landlord',
        role: UserRole.ORGANIZATION_ADMIN,
        status: UserStatus.ACTIVE,
        organizationId: landlordOrg.id,
      },
    });
    console.log('✅ Created LANDLORD:', landlordEmail);
  }

  // ============================================================
  // 3. CREATE TEST TENANT
  // ============================================================
  const tenantPasswordHash = await bcrypt.hash(tenantPassword, 10);

  const existingTenant = await prisma.tenant.findFirst({
    where: { email: tenantEmail }
  });

  if (existingTenant) {
    await prisma.tenant.update({
      where: { id: existingTenant.id },
      data: {
        firstName: 'Test',
        lastName: 'Tenant',
        phone: '555-000-0001',
        status: TenantStatus.ACTIVE,
        portalEnabled: true,
        portalPassword: tenantPasswordHash,
        isPrimary: true,
        invitationStatus: TenantInvitationStatus.ACCEPTED,
        organizationId: landlordOrg.id,
      },
    });
    console.log('✅ Updated TENANT:', tenantEmail);
  } else {
    await prisma.tenant.create({
      data: {
        firstName: 'Test',
        lastName: 'Tenant',
        email: tenantEmail,
        phone: '555-000-0001',
        status: TenantStatus.ACTIVE,
        portalEnabled: true,
        portalPassword: tenantPasswordHash,
        isPrimary: true,
        invitationStatus: TenantInvitationStatus.ACCEPTED,
        organizationId: landlordOrg.id,
      },
    });
    console.log('✅ Created TENANT:', tenantEmail);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Seed completed successfully!');
  console.log('='.repeat(60));
  console.log('\n📝 LOGIN CREDENTIALS:\n');

  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ 1. SUPER ADMIN (Platform/Dev)                          │');
  console.log('│    URL: /admin                                         │');
  console.log(`│    Email: ${superAdminEmail.padEnd(43)}│`);
  console.log(`│    Password: ${superAdminPassword.padEnd(40)}│`);
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ 2. LANDLORD (Organization Admin)                       │');
  console.log('│    URL: /login                                         │');
  console.log(`│    Email: ${landlordEmail.padEnd(43)}│`);
  console.log(`│    Password: ${landlordPassword.padEnd(40)}│`);
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ 3. TENANT                                              │');
  console.log('│    URL: /tenant/login                                  │');
  console.log(`│    Email: ${tenantEmail.padEnd(43)}│`);
  console.log(`│    Password: ${tenantPassword.padEnd(40)}│`);
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('\n⚠️  For production, set these env vars:');
  console.log('   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD');
  console.log('   TEST_LANDLORD_EMAIL, TEST_LANDLORD_PASSWORD');
  console.log('   TEST_TENANT_EMAIL, TEST_TENANT_PASSWORD\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
