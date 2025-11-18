import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';

@ApiTags('units')
@Controller('units')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all units for organization or filter by property' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property ID' })
  async findAll(
    @Query('propertyId') propertyId: string,
    @OrganizationId() organizationId: string
  ) {
    const units = propertyId
      ? await this.unitsService.findByProperty(propertyId)
      : await this.unitsService.findAll(organizationId);
    return { success: true, data: units };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unit by ID' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const unit = await this.unitsService.findById(id, organizationId);
    return { success: true, data: unit };
  }

  @Post()
  @ApiOperation({ summary: 'Create new unit' })
  async create(@Body() data: CreateUnitDto, @OrganizationId() organizationId: string) {
    const unit = await this.unitsService.create(data, organizationId);
    return { success: true, data: unit };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update unit' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateUnitDto,
    @OrganizationId() organizationId: string
  ) {
    const unit = await this.unitsService.update(id, data, organizationId);
    return { success: true, data: unit };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete unit' })
  async delete(@Param('id') id: string, @OrganizationId() organizationId: string) {
    await this.unitsService.delete(id, organizationId);
    return { success: true, message: 'Unit deleted successfully' };
  }
}
