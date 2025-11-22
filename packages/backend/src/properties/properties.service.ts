import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePropertyDto } from './dto/property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

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

  async update(id: string, dto: UpdatePropertyDto, organizationId: string) {
    // 1) Fetch by id to distinguish 404 vs 403
    const existing = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Property not found');
    }

    if (existing.organizationId !== organizationId) {
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
        notes: dto.notes ?? null,
        // Map active boolean to status enum
        status: dto.active ? 'ACTIVE' : 'INACTIVE',
      },
      include: {
        units: true,
      },
    });

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
