import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { RefreshTokenService } from './refresh-token.service';
import { ApiKeyService } from './api-key.service';
import { MobileController } from './mobile.controller';
import { DevicesController } from './devices.controller';
import { ApiKeysController } from './api-keys.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MobileController, DevicesController, ApiKeysController],
  providers: [DeviceService, RefreshTokenService, ApiKeyService],
  exports: [DeviceService, RefreshTokenService, ApiKeyService],
})
export class MobileModule {}
