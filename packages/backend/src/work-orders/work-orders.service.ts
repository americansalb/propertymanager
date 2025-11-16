import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.workOrder.findMany({
      where: {
        property: {
          organizationId,
        },
      },
      include: {
        property: true,
        unit: true,
        vendor: true,
        assignedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any, organizationId: string) {
    return this.prisma.workOrder.create({
      data,
    });
  }
}
