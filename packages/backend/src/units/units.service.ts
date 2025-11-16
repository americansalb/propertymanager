import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findByProperty(propertyId: string) {
    return this.prisma.unit.findMany({
      where: { propertyId },
      orderBy: { unitNumber: 'asc' },
    });
  }
}
