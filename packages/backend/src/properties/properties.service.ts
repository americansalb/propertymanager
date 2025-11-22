import { Injectable, NotFoundException, ForbiddenException, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePropertyDto } from './dto/property.dto';

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

  async create(data: any, organizationId: string) {
    return this.prisma.property.create({
      data: {
        ...data,
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

    // 2) Map DTO fields → DB fields (accounting for field name differences)
    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        name: dto.name,
        address1: dto.addressLine1,
        address2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        zipCode: dto.postalCode,
        country: dto.country,
        type: dto.propertyType,
        // Map active boolean to status enum
        status: dto.active ? 'ACTIVE' : 'INACTIVE',
      },
      include: {
        units: true,
      },
    });

    // 3) Compute before/after changes for logging
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const fieldMap: Record<string, keyof typeof existing> = {
      name: 'name',
      addressLine1: 'address1',
      addressLine2: 'address2',
      city: 'city',
      state: 'state',
      postalCode: 'zipCode',
      country: 'country',
      propertyType: 'type',
      active: 'status',
    };

    for (const [dtoKey, entityKey] of Object.entries(fieldMap)) {
      const before = (existing as any)[entityKey];
      const after = (updated as any)[entityKey];

      if (before !== after) {
        changes[dtoKey] = { before, after };
      }
    }

    this.logger.log(
      {
        message: 'property.updated',
        propertyId: id,
        organizationId,
        userId,
        changes,
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
