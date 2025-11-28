import { Injectable } from '@nestjs/common';
import { Prisma } from '@propertymaster/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Normalize unit data to ensure proper types for Prisma
   * Converts numeric strings to proper types and handles Decimal fields
   */
  private normalizeUnitData(data: any): any {
    const normalized: any = { ...data };

    // Ensure bedrooms is an integer
    if (normalized.bedrooms !== undefined) {
      normalized.bedrooms = Math.max(0, Math.round(Number(normalized.bedrooms) || 0));
    }

    // Ensure bathrooms is a Decimal-compatible value
    if (normalized.bathrooms !== undefined) {
      normalized.bathrooms = new Prisma.Decimal(Math.max(0, Number(normalized.bathrooms) || 0));
    }

    // Ensure marketRent is a Decimal-compatible value
    if (normalized.marketRent !== undefined) {
      normalized.marketRent = new Prisma.Decimal(Math.max(0, Number(normalized.marketRent) || 0));
    }

    // Ensure squareFeet is an integer if present
    if (normalized.squareFeet !== undefined && normalized.squareFeet !== null) {
      normalized.squareFeet = Math.max(0, Math.round(Number(normalized.squareFeet) || 0));
    }

    // Ensure floor is an integer if present
    if (normalized.floor !== undefined && normalized.floor !== null) {
      normalized.floor = Math.round(Number(normalized.floor) || 0);
    }

    return normalized;
  }

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

    // Normalize data to ensure proper types
    const normalizedData = this.normalizeUnitData(data);

    return this.prisma.unit.create({
      data: normalizedData,
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

    // Normalize data to ensure proper types
    const normalizedData = this.normalizeUnitData(data);

    return this.prisma.unit.update({
      where: { id },
      data: normalizedData,
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
