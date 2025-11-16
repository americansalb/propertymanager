import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('vendors')
@Controller('vendors')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Get()
  async findAll(@OrganizationId() organizationId: string) {
    const vendors = await this.vendorsService.findAll(organizationId);
    return { success: true, data: vendors };
  }
}
