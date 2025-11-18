import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async update(id: string, data: any, organizationId: string) {
    // Verify property belongs to organization
    const property = await this.findById(id, organizationId);
    if (!property) {
      throw new Error('Property not found');
    }

    return this.prisma.property.update({
      where: { id },
      data,
      include: {
        units: true,
      },
    });
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
