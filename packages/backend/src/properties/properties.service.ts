import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CreatePropertyDto,
  type UpdatePropertyDto,
  type FullPropertySetupDto,
} from './dto/property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

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

  async create(data: CreatePropertyDto, organizationId: string) {
    return this.prisma.property.create({
      data: {
        name: data.name,
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        type: data.type,
        totalUnits: data.totalUnits,
        yearBuilt: data.yearBuilt,
        squareFeet: data.squareFeet,
        organizationId,
      },
    });
  }

  async update(id: string, dto: UpdatePropertyDto, organizationId: string, userId?: string) {
    // 1) Fetch by id to distinguish 404 vs 403
    const existing = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!existing) {
      this.logger.warn(
        {
          message: 'property.update_not_found',
          propertyId: id,
          organizationId,
        },
        PropertiesService.name,
      );
      throw new NotFoundException('Property not found');
    }

    if (existing.organizationId !== organizationId) {
      this.logger.warn(
        {
          message: 'property.update_forbidden',
          propertyId: id,
          requestedOrgId: organizationId,
          actualOrgId: existing.organizationId,
        },
        PropertiesService.name,
      );
      throw new ForbiddenException('You do not have access to this property');
    }

    // 2) Update property with DTO fields (now aligned with DB schema)
    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        name: dto.name,
        address1: dto.address1,
        address2: dto.address2 ?? null,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country,
        type: dto.type,
        status: dto.status,
        totalUnits: dto.totalUnits,
        yearBuilt: dto.yearBuilt,
        squareFeet: dto.squareFeet,
      },
      include: {
        units: true,
      },
    });

    // 3) Log the update
    this.logger.log(
      {
        message: 'property.updated',
        propertyId: id,
        organizationId,
        userId,
      },
      PropertiesService.name,
    );

    return updated;
  }

  async delete(id: string, organizationId: string) {
    // Verify property belongs to organization
    const property = await this.findById(id, organizationId);
    if (!property) {
      throw new Error('Property not found');
    }

    // Use transaction to delete related records first, then property
    return this.prisma.$transaction(async (tx) => {
      // Delete work orders associated with this property
      await tx.workOrder.deleteMany({
        where: { propertyId: id },
      });

      // Delete documents associated with this property
      await tx.document.deleteMany({
        where: { propertyId: id },
      });

      // Delete the property (units, leases, accounts cascade automatically)
      return tx.property.delete({
        where: { id },
      });
    });
  }

  /**
   * Full property setup - creates property, units, leases, and tenants in one transaction
   * Handles existing units gracefully (skips duplicates, doesn't wipe data)
   */
  async fullSetup(dto: FullPropertySetupDto, organizationId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the property
      const property = await tx.property.create({
        data: {
          name: dto.name,
          type: dto.type,
          status: 'ACTIVE',
          address1: dto.address1,
          address2: dto.address2,
          city: dto.city,
          state: dto.state,
          zipCode: dto.zipCode,
          country: dto.country || 'US',
          latitude: dto.latitude,
          longitude: dto.longitude,
          yearBuilt: dto.yearBuilt,
          totalUnits: dto.units.length,
          organizationId,
        },
      });

      this.logger.log(
        {
          message: 'property.fullSetup.created',
          propertyId: property.id,
          organizationId,
          unitCount: dto.units.length,
        },
        PropertiesService.name,
      );

      // 2. Create units and leases
      const createdUnits = [];
      const createdLeases = [];
      const createdTenants = [];

      for (const unitDto of dto.units) {
        // Check if unit already exists for this property (by unitNumber)
        const existingUnit = await tx.unit.findUnique({
          where: {
            propertyId_unitNumber: {
              propertyId: property.id,
              unitNumber: unitDto.unitNumber,
            },
          },
        });

        if (existingUnit) {
          // Skip existing units - don't overwrite
          this.logger.log(
            {
              message: 'property.fullSetup.unitExists',
              propertyId: property.id,
              unitNumber: unitDto.unitNumber,
            },
            PropertiesService.name,
          );
          createdUnits.push(existingUnit);
          continue;
        }

        // Create the unit
        const unit = await tx.unit.create({
          data: {
            unitNumber: unitDto.unitNumber,
            floor: unitDto.floor,
            type: unitDto.type,
            status: unitDto.status,
            bedrooms: unitDto.bedrooms,
            bathrooms: unitDto.bathrooms,
            squareFeet: unitDto.squareFeet,
            marketRent: unitDto.marketRent,
            propertyId: property.id,
          },
        });
        createdUnits.push(unit);

        // 3. If occupied and has tenant info, create lease and tenant
        if (unitDto.status === 'OCCUPIED' && unitDto.tenant) {
          const leaseStart = unitDto.leaseStart ? new Date(unitDto.leaseStart) : new Date();
          const leaseEnd = unitDto.leaseEnd ? new Date(unitDto.leaseEnd) : null;
          const isMonthToMonth = unitDto.isMonthToMonth ?? !leaseEnd;

          const lease = await tx.lease.create({
            data: {
              status: 'ACTIVE',
              type: isMonthToMonth ? 'MONTH_TO_MONTH' : 'FIXED_TERM',
              startDate: leaseStart,
              endDate: leaseEnd,
              moveInDate: leaseStart,
              monthlyRent: unitDto.actualRent ?? unitDto.marketRent,
              securityDeposit: unitDto.securityDeposit ?? unitDto.marketRent,
              unitId: unit.id,
              tenants: {
                create: {
                  firstName: unitDto.tenant.firstName,
                  lastName: unitDto.tenant.lastName,
                  email: unitDto.tenant.email,
                  phone: unitDto.tenant.phone,
                  isPrimary: true,
                },
              },
            },
            include: {
              tenants: true,
            },
          });
          createdLeases.push(lease);
          createdTenants.push(...lease.tenants);
        }
      }

      // 4. Return comprehensive result
      const occupiedCount = createdUnits.filter((u) => u.status === 'OCCUPIED').length;
      const vacantCount = createdUnits.filter((u) => u.status === 'VACANT').length;
      const totalRent = createdLeases.reduce((sum, l) => sum + Number(l.monthlyRent), 0);

      return {
        property,
        units: createdUnits,
        leases: createdLeases,
        tenants: createdTenants,
        summary: {
          totalUnits: createdUnits.length,
          occupiedUnits: occupiedCount,
          vacantUnits: vacantCount,
          occupancyRate:
            createdUnits.length > 0 ? Math.round((occupiedCount / createdUnits.length) * 100) : 0,
          monthlyRevenue: totalRent,
          setupComplete: true,
        },
      };
    });
  }
}
