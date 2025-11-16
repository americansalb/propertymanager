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
}
