import { Injectable, NotFoundException, ForbiddenException, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.property.findMany({
      where: { organizationId },
      include: {
        units: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.property.findFirst({
      where: { id, organizationId },
      include: {
        units: true,
      },
    });
  }

  async create(data: CreatePropertyDto, organizationId: string) {
    return this.prisma.property.create({
      data: {
        name: data.name,
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        type: data.type,
        totalUnits: data.totalUnits,
        yearBuilt: data.yearBuilt,
        squareFeet: data.squareFeet,
        organizationId,
      },
    });
  }

  async update(id: string, dto: UpdatePropertyDto, organizationId: string, userId?: string) {
    // 1) Fetch by id to distinguish 404 vs 403
    const existing = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!existing) {
      this.logger.warn(
        {
          message: 'property.update_not_found',
          propertyId: id,
          organizationId,
        },
        PropertiesService.name,
      );
      throw new NotFoundException('Property not found');
    }

    if (existing.organizationId !== organizationId) {
      this.logger.warn(
        {
          message: 'property.update_forbidden',
          propertyId: id,
          requestedOrgId: organizationId,
          actualOrgId: existing.organizationId,
        },
        PropertiesService.name,
      );
      throw new ForbiddenException('You do not have access to this property');
    }

    // 2) Update property with DTO fields (now aligned with DB schema)
    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        name: dto.name,
        address1: dto.address1,
        address2: dto.address2 ?? null,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country,
        type: dto.type,
        status: dto.status,
        totalUnits: dto.totalUnits,
        yearBuilt: dto.yearBuilt,
        squareFeet: dto.squareFeet,
      },
      include: {
        units: true,
      },
    });

    // 3) Log the update
    this.logger.log(
      {
        message: 'property.updated',
        propertyId: id,
        organizationId,
        userId,
      },
      PropertiesService.name,
    );

    return updated;
  }

  async delete(id: string, organizationId: string) {
    // Verify property belongs to organization
    const property = await this.findById(id, organizationId);
    if (!property) {
      throw new Error('Property not found');
    }

    return this.prisma.property.delete({
      where: { id },
    });
  }
}
