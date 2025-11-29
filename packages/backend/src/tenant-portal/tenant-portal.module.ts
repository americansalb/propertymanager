import { Module } from '@nestjs/common';
import { TenantPortalController } from './tenant-portal.controller';
import { TenantPortalService } from './tenant-portal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantAuthModule } from '../tenant-auth/tenant-auth.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, TenantAuthModule, PaymentsModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService],
  exports: [TenantPortalService],
})
export class TenantPortalModule {}
