import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UnitsService } from './units.service';

@ApiTags('units')
@Controller('units')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Get()
  async findAll(@Query('propertyId') propertyId: string) {
    const units = await this.unitsService.findByProperty(propertyId);
    return { success: true, data: units };
  }
}
