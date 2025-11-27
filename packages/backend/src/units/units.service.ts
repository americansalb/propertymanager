import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.unit.findMany({
      where: {
        property: {
          organizationId,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    });
  }

  async findByProperty(propertyId: string) {
    return this.prisma.unit.findMany({
      where: { propertyId },
      orderBy: { unitNumber: 'asc' },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.unit.findFirst({
      where: {
        id,
        property: {
          organizationId,
        },
      },
      include: {
        property: true,
      },
    });
  }

  async create(data: any, organizationId: string) {
    // Verify property belongs to organization
    const property = await this.prisma.property.findFirst({
      where: {
        id: data.propertyId,
        organizationId,
      },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    return this.prisma.unit.create({
      data,
      include: {
        property: true,
      },
    });
  }

  async update(id: string, data: any, organizationId: string) {
    // Verify unit belongs to organization
    const unit = await this.findById(id, organizationId);
    if (!unit) {
      throw new Error('Unit not found');
    }

    // If propertyId is being updated, verify new property belongs to organization
    if (data.propertyId && data.propertyId !== unit.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: {
          id: data.propertyId,
          organizationId,
        },
      });

      if (!property) {
        throw new Error('Property not found');
      }
    }

    return this.prisma.unit.update({
      where: { id },
      data,
      include: {
        property: true,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    // Verify unit belongs to organization
    const unit = await this.findById(id, organizationId);
    if (!unit) {
      throw new Error('Unit not found');
    }

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
