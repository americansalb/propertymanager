import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('leases')
@Controller('leases')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class LeasesController {
  constructor(private leasesService: LeasesService) {}

  @Get()
  async findAll(@OrganizationId() organizationId: string) {
    const leases = await this.leasesService.findAll(organizationId);
    return { success: true, data: leases };
  }
}
