import { Module } from '@nestjs/common';
import { TenantPortalController } from './tenant-portal.controller';
import { TenantPortalService } from './tenant-portal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantAuthModule } from '../tenant-auth/tenant-auth.module';

@Module({
  imports: [PrismaModule, TenantAuthModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService],
  exports: [TenantPortalService],
})
export class TenantPortalModule {}
