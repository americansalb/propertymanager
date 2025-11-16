import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { OrganizationId } from '../common/decorators/organization.decorator';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('current')
  async getCurrent(@OrganizationId() organizationId: string) {
    const org = await this.organizationsService.findById(organizationId);
    return { success: true, data: org };
  }
}
