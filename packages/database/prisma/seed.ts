import {
  PrismaClient,
  TenantStatus,
  TenantInvitationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('📋 This seed creates a test tenant in your existing organization');

  // Find the existing admin user (landlord@aalb.org) and their organization
  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: 'landlord@aalb.org'
    },
    select: {
      id: true,
      organizationId: true,
      organization: { select: { name: true } }
    }
  });

  if (!existingAdmin) {
    console.log('❌ No admin user found with email landlord@aalb.org');
    console.log('   Please ensure your admin account exists first.');
    return;
  }

  console.log(`✅ Found admin in organization: ${existingAdmin.organization?.name}`);
  const organizationId = existingAdmin.organizationId;

  // Delete any existing test tenant
  await prisma.tenant.deleteMany({
    where: {
      email: 'tenant@aalb.org'
    }
  });
  console.log('🗑️ Cleared any existing test tenant');

  // Create test tenant in the SAME organization as the admin
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
      organizationId: organizationId,
      // NO unitId - landlord will assign from admin portal
    },
  });

  console.log('✅ Created test tenant:', testTenant.email);
  console.log('   Organization ID:', organizationId);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin Portal: landlord@aalb.org (your existing account)');
  console.log('\n   Tenant Portal:');
  console.log('     Email: tenant@aalb.org');
  console.log('     Password: winner');
  console.log('     Note: Go to Tenants page and assign to a property/unit');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
