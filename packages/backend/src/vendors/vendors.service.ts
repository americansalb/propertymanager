import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.vendor.findMany({
      where: { organizationId },
      orderBy: { companyName: 'asc' },
    });
  }
}
