import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOccupancyReport(organizationId: string) {
    // Placeholder for occupancy report
    return {
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      occupancyRate: 0,
    };
  }
}
