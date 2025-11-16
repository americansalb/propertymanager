import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.lease.findMany({
      where: {
        unit: {
          property: {
            organizationId,
          },
        },
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        tenants: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }
}
