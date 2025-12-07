import {
  PrismaClient,
  UserRole,
  UserStatus,
  OrganizationType,
  SubscriptionPlan,
  TenantStatus,
  TenantInvitationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('📋 This seed only creates admin accounts and test tenant - your real data is preserved!');

  // Delete only the specific admin users we're creating (to reset credentials)
  await prisma.refreshToken.deleteMany({
    where: {
      user: {
        email: { in: ['contact@aalb.org', 'admin@aalb.org'] }
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: ['contact@aalb.org', 'admin@aalb.org'] }
    }
  });

  // Delete the test tenant to reset its state
  await prisma.tenant.deleteMany({
    where: {
      email: 'tenant@aalb.org'
    }
  });
  console.log('🗑️ Cleared demo accounts for fresh credentials');

  // Upsert organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'aalb' },
    update: {
      name: 'AALB Properties',
      type: OrganizationType.PROPERTY_MANAGER,
      plan: SubscriptionPlan.PROFESSIONAL,
    },
    create: {
      name: 'AALB Properties',
      slug: 'aalb',
      type: OrganizationType.PROPERTY_MANAGER,
      plan: SubscriptionPlan.PROFESSIONAL,
      settings: {},
    },
  });

  console.log('✅ Created/updated organization:', organization.name);

  // Create public marketplace organization for vendor self-registration
  const publicMarketplace = await prisma.organization.upsert({
    where: { slug: 'public-marketplace' },
    update: {
      name: 'Public Marketplace',
      type: OrganizationType.PROPERTY_MANAGER,
      plan: SubscriptionPlan.TRIAL,
    },
    create: {
      id: 'public-marketplace',
      name: 'Public Marketplace',
      slug: 'public-marketplace',
      type: OrganizationType.PROPERTY_MANAGER,
      plan: SubscriptionPlan.TRIAL,
      settings: {},
    },
  });

  console.log('✅ Created/updated public marketplace organization:', publicMarketplace.name);

  // Create admin user with fresh password
  const passwordHash = await bcrypt.hash('winner', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'contact@aalb.org',
      passwordHash,
      firstName: 'Admin',
      lastName: 'AALB',
      phone: '',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      organizationId: organization.id,
      failedLoginAttempts: 0,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create admin@aalb.org alias
  const adminAlias = await prisma.user.create({
    data: {
      email: 'admin@aalb.org',
      passwordHash,
      firstName: 'Admin',
      lastName: 'AALB',
      phone: '',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      organizationId: organization.id,
      failedLoginAttempts: 0,
    },
  });

  console.log('✅ Created admin alias:', adminAlias.email);

  // Verify password hash works
  const verifyPassword = await bcrypt.compare('winner', adminUser.passwordHash);
  if (verifyPassword) {
    console.log('✅ Password verification: SUCCESS');
  } else {
    console.error('❌ Password verification: FAILED - hash mismatch!');
    console.log('   Hash stored:', adminUser.passwordHash?.substring(0, 20) + '...');
  }

  // Create test tenant for tenant portal (NO unit assignment - landlord will assign)
  const tenantPasswordHash = await bcrypt.hash('winner', 10);
  const testTenant = await prisma.tenant.create({
    data: {
      firstName: 'Test',
      lastName: 'Tenant',
      email: 'tenant@aalb.org',
      phone: '555-000-0001',
      status: TenantStatus.ACTIVE,
      portalEnabled: true,
      portalPassword: tenantPasswordHash,
      isPrimary: true,
      invitationStatus: TenantInvitationStatus.ACCEPTED,
      organizationId: organization.id,
      // NO unitId - landlord will assign from admin portal
    },
  });

  console.log('✅ Created test tenant:', testTenant.email);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin Portal:');
  console.log('     Email: contact@aalb.org (or admin@aalb.org)');
  console.log('     Password: winner');
  console.log('\n   Tenant Portal:');
  console.log('     Email: tenant@aalb.org');
  console.log('     Password: winner');
  console.log('     Note: No property assigned yet - assign from admin portal Tenants page');
  console.log('\n💡 Add your real properties in the admin portal, then assign the test tenant!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
