import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import {
  type CreateServiceCatalogDto,
  type UpdateServiceCatalogDto,
  type ServiceCatalogQueryDto,
  type CreateMarketplaceJobDto,
  type DispatchJobDto,
  type AcceptJobDto,
  type DeclineJobDto,
  type SubmitQuoteDto,
  type CompleteJobDto,
  type ConfirmJobDto,
  type DisputeJobDto,
  type MarketplaceJobQueryDto,
  type CreateVendorMarketplaceProfileDto,
  type UpdateVendorMarketplaceProfileDto,
  type AddVendorServiceDto,
  type UpdateVendorServiceDto,
  type VendorMarketplaceQueryDto,
  type CreateVendorRatingDto,
  type UpdateVendorRatingDto,
  type VendorRatingQueryDto,
} from './dto';

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  // ============================================================================
  // SERVICE CATALOG METHODS
  // ============================================================================

  async createServiceCatalog(dto: CreateServiceCatalogDto) {
    const service = await this.prisma.serviceCatalog.create({
      data: {
        category: dto.category,
        name: dto.name,
        description: dto.description,
        requiresQuote: dto.requiresQuote ?? false,
        standardQuoteFee: dto.standardQuoteFee,
        isFlatRate: dto.isFlatRate ?? true,
        laborMin: dto.laborMin,
        laborMax: dto.laborMax,
        partsMin: dto.partsMin,
        partsMax: dto.partsMax,
        typicalTotalMin: dto.typicalTotalMin,
        typicalTotalMax: dto.typicalTotalMax,
        typicalDurationMinutes: dto.typicalDurationMinutes,
        region: dto.region || 'CHICAGO_IL',
      },
    });

    this.logger.log('info', 'service_catalog.created', {
      serviceId: service.id,
      category: service.category,
      name: service.name,
    });

    return service;
  }

  async findAllServiceCatalog(query?: ServiceCatalogQueryDto) {
    const where: any = {};

    if (query?.category) {
      where.category = query.category;
    }
    if (query?.region) {
      where.region = query.region;
    }
    if (query?.activeOnly) {
      where.isActive = true;
    }

    return this.prisma.serviceCatalog.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOneServiceCatalog(id: string) {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id },
      include: {
        vendorServices: {
          where: { isActive: true },
          include: {
            vendorProfile: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    companyName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async updateServiceCatalog(id: string, dto: UpdateServiceCatalogDto) {
    await this.findOneServiceCatalog(id);

    return this.prisma.serviceCatalog.update({
      where: { id },
      data: dto,
    });
  }

  async deleteServiceCatalog(id: string) {
    await this.findOneServiceCatalog(id);

    // Check if any marketplace jobs use this service
    const jobCount = await this.prisma.marketplaceJob.count({
      where: { serviceCatalogId: id },
    });

    if (jobCount > 0) {
      // Soft delete - deactivate
      return this.prisma.serviceCatalog.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.serviceCatalog.delete({ where: { id } });
  }

  // ============================================================================
  // VENDOR MARKETPLACE PROFILE METHODS
  // ============================================================================

  async createVendorMarketplaceProfile(
    dto: CreateVendorMarketplaceProfileDto,
    organizationId: string,
  ) {
    // Verify vendor exists and belongs to organization
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found`);
    }

    // Check if profile already exists
    const existingProfile = await this.prisma.vendorMarketplaceProfile.findUnique({
      where: { vendorId: dto.vendorId },
    });

    if (existingProfile) {
      throw new BadRequestException('Vendor already has a marketplace profile');
    }

    const profile = await this.prisma.vendorMarketplaceProfile.create({
      data: {
        vendorId: dto.vendorId,
        tier: dto.tier || 'STANDARD',
        isMarketplaceActive: dto.isMarketplaceActive ?? true,
        serviceZipCodes: dto.serviceZipCodes || [],
        serviceRadius: dto.serviceRadius,
        maxConcurrentJobs: dto.maxConcurrentJobs || 5,
      },
      include: {
        vendor: true,
      },
    });

    this.logger.log('info', 'vendor_marketplace_profile.created', {
      profileId: profile.id,
      vendorId: vendor.id,
      companyName: vendor.companyName,
    });

    return profile;
  }

  async findAllVendorMarketplaceProfiles(
    query?: VendorMarketplaceQueryDto,
    organizationId?: string,
  ) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isMarketplaceActive: true,
    };

    if (organizationId) {
      where.vendor = { organizationId };
    }

    if (query?.tier) {
      where.tier = query.tier;
    }

    if (query?.minRating) {
      where.averageRating = { gte: query.minRating };
    }

    if (query?.acceptingOnly) {
      where.acceptingJobs = true;
    }

    if (query?.zipCode) {
      where.serviceZipCodes = { has: query.zipCode };
    }

    if (query?.category) {
      where.services = {
        some: {
          isActive: true,
          serviceCatalog: {
            category: query.category,
          },
        },
      };
    }

    const [profiles, total] = await Promise.all([
      this.prisma.vendorMarketplaceProfile.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              phone: true,
              email: true,
              address1: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
          services: {
            where: { isActive: true },
            include: {
              serviceCatalog: true,
            },
          },
        },
        orderBy: [{ tier: 'desc' }, { averageRating: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.vendorMarketplaceProfile.count({ where }),
    ]);

    return {
      data: profiles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneVendorMarketplaceProfile(id: string) {
    const profile = await this.prisma.vendorMarketplaceProfile.findUnique({
      where: { id },
      include: {
        vendor: true,
        services: {
          include: {
            serviceCatalog: true,
          },
        },
        ratings: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Vendor marketplace profile with ID ${id} not found`);
    }

    return profile;
  }

  async findVendorMarketplaceProfileByVendorId(vendorId: string, organizationId: string) {
    // Verify vendor belongs to organization
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const profile = await this.prisma.vendorMarketplaceProfile.findUnique({
      where: { vendorId },
      include: {
        vendor: true,
        services: {
          include: {
            serviceCatalog: true,
          },
        },
        ratings: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return profile;
  }

  async updateVendorMarketplaceProfile(
    id: string,
    dto: UpdateVendorMarketplaceProfileDto,
    organizationId: string,
  ) {
    const profile = await this.prisma.vendorMarketplaceProfile.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!profile) {
      throw new NotFoundException(`Vendor marketplace profile with ID ${id} not found`);
    }

    if (profile.vendor.organizationId !== organizationId) {
      throw new BadRequestException('Vendor does not belong to your organization');
    }

    return this.prisma.vendorMarketplaceProfile.update({
      where: { id },
      data: dto,
      include: {
        vendor: true,
        services: {
          include: {
            serviceCatalog: true,
          },
        },
      },
    });
  }

  async addVendorService(profileId: string, dto: AddVendorServiceDto, organizationId: string) {
    const profile = await this.prisma.vendorMarketplaceProfile.findUnique({
      where: { id: profileId },
      include: { vendor: true },
    });

    if (!profile) {
      throw new NotFoundException(`Vendor marketplace profile with ID ${profileId} not found`);
    }

    if (profile.vendor.organizationId !== organizationId) {
      throw new BadRequestException('Vendor does not belong to your organization');
    }

    // Verify service catalog exists
    const serviceCatalog = await this.prisma.serviceCatalog.findUnique({
      where: { id: dto.serviceCatalogId },
    });

    if (!serviceCatalog) {
      throw new NotFoundException(`Service catalog with ID ${dto.serviceCatalogId} not found`);
    }

    return this.prisma.vendorService.create({
      data: {
        vendorProfileId: profileId,
        serviceCatalogId: dto.serviceCatalogId,
        customQuoteFee: dto.customQuoteFee,
        customLaborRate: dto.customLaborRate,
        customFlatRate: dto.customFlatRate,
      },
      include: {
        serviceCatalog: true,
      },
    });
  }

  async updateVendorService(
    serviceId: string,
    dto: UpdateVendorServiceDto,
    organizationId: string,
  ) {
    const vendorService = await this.prisma.vendorService.findUnique({
      where: { id: serviceId },
      include: {
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    if (!vendorService) {
      throw new NotFoundException(`Vendor service with ID ${serviceId} not found`);
    }

    if (vendorService.vendorProfile.vendor.organizationId !== organizationId) {
      throw new BadRequestException('Vendor does not belong to your organization');
    }

    return this.prisma.vendorService.update({
      where: { id: serviceId },
      data: dto,
      include: {
        serviceCatalog: true,
      },
    });
  }

  async removeVendorService(serviceId: string, organizationId: string) {
    const vendorService = await this.prisma.vendorService.findUnique({
      where: { id: serviceId },
      include: {
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    if (!vendorService) {
      throw new NotFoundException(`Vendor service with ID ${serviceId} not found`);
    }

    if (vendorService.vendorProfile.vendor.organizationId !== organizationId) {
      throw new BadRequestException('Vendor does not belong to your organization');
    }

    return this.prisma.vendorService.delete({ where: { id: serviceId } });
  }

  // ============================================================================
  // MARKETPLACE JOB METHODS
  // ============================================================================

  async createMarketplaceJob(dto: CreateMarketplaceJobDto, organizationId: string, userId: string) {
    // Verify work order exists and belongs to organization
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: dto.workOrderId, organizationId },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${dto.workOrderId} not found`);
    }

    // Check if marketplace job already exists for this work order
    const existingJob = await this.prisma.marketplaceJob.findUnique({
      where: { workOrderId: dto.workOrderId },
    });

    if (existingJob) {
      throw new BadRequestException('A marketplace job already exists for this work order');
    }

    // Verify service catalog if provided
    if (dto.serviceCatalogId) {
      const service = await this.prisma.serviceCatalog.findUnique({
        where: { id: dto.serviceCatalogId },
      });

      if (!service) {
        throw new NotFoundException(`Service catalog with ID ${dto.serviceCatalogId} not found`);
      }
    }

    // Calculate platform fee based on protection tier
    const platformFeePercent = dto.protectionTier === 'BASIC' ? 3 : 12;

    const job = await this.prisma.marketplaceJob.create({
      data: {
        workOrderId: dto.workOrderId,
        source: dto.source || 'MARKETPLACE',
        status: 'PENDING_DISPATCH',
        serviceCatalogId: dto.serviceCatalogId,
        protectionTier: dto.protectionTier || 'PROTECTED',
        estimatedTotal: dto.estimatedTotal,
        platformFeePercent,
      },
      include: {
        serviceCatalog: true,
      },
    });

    this.logger.log('info', 'marketplace_job.created', {
      jobId: job.id,
      workOrderId: dto.workOrderId,
      source: job.source,
      organizationId,
      userId,
    });

    try {
      await this.eventsService.track(
        {
          name: 'MARKETPLACE_JOB_CREATED',
          category: 'marketplace',
          properties: {
            jobId: job.id,
            workOrderId: dto.workOrderId,
            source: job.source,
            protectionTier: job.protectionTier,
          },
        },
        organizationId,
        userId,
      );
    } catch (error) {
      this.logger.log('warn', 'Failed to track marketplace job creation event', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return job;
  }

  async findAllMarketplaceJobs(query?: MarketplaceJobQueryDto, organizationId?: string) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    // Build workOrderId filter based on organization and property
    let workOrderIds: string[] | undefined;

    if (organizationId || query?.propertyId) {
      const workOrderWhere: any = {};
      if (organizationId) {
        workOrderWhere.organizationId = organizationId;
      }
      if (query?.propertyId) {
        workOrderWhere.propertyId = query.propertyId;
      }

      const workOrders = await this.prisma.workOrder.findMany({
        where: workOrderWhere,
        select: { id: true },
      });
      workOrderIds = workOrders.map((wo) => wo.id);

      // If no work orders found, return empty result
      if (workOrderIds.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
    }

    const where: any = {};

    if (workOrderIds) {
      where.workOrderId = { in: workOrderIds };
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.vendorProfileId) {
      where.vendorProfileId = query.vendorProfileId;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.marketplaceJob.findMany({
        where,
        include: {
          serviceCatalog: true,
          vendorProfile: {
            include: {
              vendor: {
                select: {
                  id: true,
                  companyName: true,
                  contactName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
          dispatches: {
            orderBy: { createdAt: 'desc' },
          },
          rating: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketplaceJob.count({ where }),
    ]);

    // Fetch work order details separately to avoid circular references
    const jobsWithWorkOrders = await Promise.all(
      jobs.map(async (job) => {
        const workOrder = await this.prisma.workOrder.findUnique({
          where: { id: job.workOrderId },
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address1: true,
                city: true,
                state: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
              },
            },
          },
        });
        return { ...job, workOrder };
      }),
    );

    return {
      data: jobsWithWorkOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneMarketplaceJob(id: string, organizationId: string) {
    const job = await this.prisma.marketplaceJob.findUnique({
      where: { id },
      include: {
        serviceCatalog: true,
        vendorProfile: {
          include: {
            vendor: true,
          },
        },
        dispatches: {
          include: {
            vendorProfile: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    companyName: true,
                    contactName: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        rating: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Marketplace job with ID ${id} not found`);
    }

    // Verify work order belongs to organization
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: job.workOrderId },
      include: {
        property: true,
        unit: true,
      },
    });

    if (!workOrder || workOrder.organizationId !== organizationId) {
      throw new NotFoundException(`Marketplace job with ID ${id} not found`);
    }

    return { ...job, workOrder };
  }

  async dispatchJob(id: string, dto: DispatchJobDto, organizationId: string, userId: string) {
    const job = await this.findOneMarketplaceJob(id, organizationId);

    if (!['PENDING_DISPATCH', 'QUOTE_DECLINED'].includes(job.status)) {
      throw new BadRequestException(`Cannot dispatch job with status ${job.status}`);
    }

    // Verify vendor profile exists
    const vendorProfile = await this.prisma.vendorMarketplaceProfile.findUnique({
      where: { id: dto.vendorProfileId },
      include: { vendor: true },
    });

    if (!vendorProfile) {
      throw new NotFoundException(`Vendor profile with ID ${dto.vendorProfileId} not found`);
    }

    if (!vendorProfile.isMarketplaceActive || !vendorProfile.acceptingJobs) {
      throw new BadRequestException('Vendor is not currently accepting jobs');
    }

    // Create dispatch record
    await this.prisma.jobDispatch.create({
      data: {
        marketplaceJobId: id,
        vendorProfileId: dto.vendorProfileId,
        status: 'PENDING',
        responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Update job
    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'DISPATCHED',
        vendorProfileId: dto.vendorProfileId,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        scheduledTimeSlot: dto.scheduledTimeSlot,
        estimatedTotal: dto.estimatedAmount,
      },
      include: {
        serviceCatalog: true,
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    this.logger.log('info', 'marketplace_job.dispatched', {
      jobId: id,
      vendorProfileId: dto.vendorProfileId,
      vendorName: vendorProfile.vendor.companyName,
      organizationId,
      userId,
    });

    return updatedJob;
  }

  async acceptJob(id: string, dto: AcceptJobDto, vendorProfileId: string) {
    const job = await this.prisma.marketplaceJob.findUnique({
      where: { id },
      include: { dispatches: true },
    });

    if (!job) {
      throw new NotFoundException(`Marketplace job with ID ${id} not found`);
    }

    if (job.status !== 'DISPATCHED') {
      throw new BadRequestException(`Cannot accept job with status ${job.status}`);
    }

    if (job.vendorProfileId !== vendorProfileId) {
      throw new BadRequestException('This job was not dispatched to you');
    }

    // Update dispatch record
    await this.prisma.jobDispatch.updateMany({
      where: {
        marketplaceJobId: id,
        vendorProfileId,
        status: 'PENDING',
      },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });

    // Update job
    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        vendorEta: dto.vendorEta ? new Date(dto.vendorEta) : undefined,
      },
      include: {
        serviceCatalog: true,
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    // Increment vendor's active jobs count
    await this.prisma.vendorMarketplaceProfile.update({
      where: { id: vendorProfileId },
      data: {
        currentActiveJobs: { increment: 1 },
      },
    });

    this.logger.log('info', 'marketplace_job.accepted', {
      jobId: id,
      vendorProfileId,
    });

    return updatedJob;
  }

  async declineJob(id: string, dto: DeclineJobDto, vendorProfileId: string) {
    const job = await this.prisma.marketplaceJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Marketplace job with ID ${id} not found`);
    }

    if (job.status !== 'DISPATCHED') {
      throw new BadRequestException(`Cannot decline job with status ${job.status}`);
    }

    if (job.vendorProfileId !== vendorProfileId) {
      throw new BadRequestException('This job was not dispatched to you');
    }

    // Update dispatch record
    await this.prisma.jobDispatch.updateMany({
      where: {
        marketplaceJobId: id,
        vendorProfileId,
        status: 'PENDING',
      },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
        declineReason: dto.reason,
      },
    });

    // Reset job to pending dispatch
    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'PENDING_DISPATCH',
        vendorProfileId: null,
      },
    });

    this.logger.log('info', 'marketplace_job.declined', {
      jobId: id,
      vendorProfileId,
      reason: dto.reason,
    });

    return updatedJob;
  }

  async submitQuote(id: string, dto: SubmitQuoteDto, vendorProfileId: string) {
    const job = await this.prisma.marketplaceJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Marketplace job with ID ${id} not found`);
    }

    if (job.status !== 'ACCEPTED') {
      throw new BadRequestException(`Cannot submit quote for job with status ${job.status}`);
    }

    if (job.vendorProfileId !== vendorProfileId) {
      throw new BadRequestException('This job is not assigned to you');
    }

    const totalCost = dto.laborCost + (dto.partsCost || 0);
    const platformFee = (totalCost * Number(job.platformFeePercent)) / 100;

    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'QUOTE_SUBMITTED',
        estimatedTotal: totalCost,
        platformFeeAmount: platformFee,
        completionNotes: dto.description,
        completionPhotos: dto.photos || [],
      },
      include: {
        serviceCatalog: true,
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    this.logger.log('info', 'marketplace_job.quote_submitted', {
      jobId: id,
      vendorProfileId,
      totalCost,
    });

    return updatedJob;
  }

  async approveQuote(id: string, organizationId: string, userId: string) {
    const job = await this.findOneMarketplaceJob(id, organizationId);

    if (job.status !== 'QUOTE_SUBMITTED') {
      throw new BadRequestException(`Cannot approve quote for job with status ${job.status}`);
    }

    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'QUOTE_APPROVED',
        paymentSecuredAt: new Date(),
        paymentSecuredAmount: job.estimatedTotal,
      },
      include: {
        serviceCatalog: true,
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    this.logger.log('info', 'marketplace_job.quote_approved', {
      jobId: id,
      organizationId,
      userId,
    });

    return updatedJob;
  }

  async declineQuote(id: string, organizationId: string, userId: string) {
    const job = await this.findOneMarketplaceJob(id, organizationId);

    if (job.status !== 'QUOTE_SUBMITTED') {
      throw new BadRequestException(`Cannot decline quote for job with status ${job.status}`);
    }

    // Reset job to allow re-dispatch
    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'QUOTE_DECLINED',
        vendorProfileId: null,
      },
    });

    this.logger.log('info', 'marketplace_job.quote_declined', {
      jobId: id,
      organizationId,
      userId,
    });

    return updatedJob;
  }

  async startJob(id: string, vendorProfileId: string) {
    const job = await this.prisma.marketplaceJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Marketplace job with ID ${id} not found`);
    }

    if (!['ACCEPTED', 'QUOTE_APPROVED'].includes(job.status)) {
      throw new BadRequestException(`Cannot start job with status ${job.status}`);
    }

    if (job.vendorProfileId !== vendorProfileId) {
      throw new BadRequestException('This job is not assigned to you');
    }

    return this.prisma.marketplaceJob.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  async completeJob(id: string, dto: CompleteJobDto, vendorProfileId: string) {
    const job = await this.prisma.marketplaceJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Marketplace job with ID ${id} not found`);
    }

    if (!['IN_PROGRESS', 'QUOTE_APPROVED', 'ACCEPTED'].includes(job.status)) {
      throw new BadRequestException(`Cannot complete job with status ${job.status}`);
    }

    if (job.vendorProfileId !== vendorProfileId) {
      throw new BadRequestException('This job is not assigned to you');
    }

    const platformFee = (dto.actualCost * Number(job.platformFeePercent)) / 100;

    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualTotal: dto.actualCost,
        platformFeeAmount: platformFee,
        completedAt: new Date(),
        completionNotes: dto.completionNotes,
        completionPhotos: dto.completionPhotos || [],
        workmanshipGuaranteeExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
      include: {
        serviceCatalog: true,
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    this.logger.log('info', 'marketplace_job.completed', {
      jobId: id,
      vendorProfileId,
      actualCost: dto.actualCost,
    });

    return updatedJob;
  }

  async confirmJob(id: string, dto: ConfirmJobDto, organizationId: string, userId: string) {
    const job = await this.findOneMarketplaceJob(id, organizationId);

    if (job.status !== 'COMPLETED') {
      throw new BadRequestException(`Cannot confirm job with status ${job.status}`);
    }

    // Calculate payout amount
    const payoutAmount = Number(job.actualTotal) - Number(job.platformFeeAmount || 0);

    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: userId,
        paymentReleasedAt: new Date(),
        paymentReleasedAmount: payoutAmount,
      },
      include: {
        serviceCatalog: true,
        vendorProfile: {
          include: { vendor: true },
        },
      },
    });

    // Update vendor statistics
    if (job.vendorProfileId) {
      await this.prisma.vendorMarketplaceProfile.update({
        where: { id: job.vendorProfileId },
        data: {
          totalJobsCompleted: { increment: 1 },
          currentActiveJobs: { decrement: 1 },
        },
      });
    }

    // Update work order status
    await this.prisma.workOrder.update({
      where: { id: job.workOrderId },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        actualCost: job.actualTotal,
      },
    });

    this.logger.log('info', 'marketplace_job.confirmed', {
      jobId: id,
      organizationId,
      userId,
      payoutAmount,
    });

    return updatedJob;
  }

  async disputeJob(id: string, dto: DisputeJobDto, organizationId: string, userId: string) {
    const job = await this.findOneMarketplaceJob(id, organizationId);

    if (!['COMPLETED', 'CONFIRMED'].includes(job.status)) {
      throw new BadRequestException(`Cannot dispute job with status ${job.status}`);
    }

    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'DISPUTED',
        disputeStatus: 'OPEN',
        disputeReason: dto.reason,
      },
    });

    this.logger.log('info', 'marketplace_job.disputed', {
      jobId: id,
      organizationId,
      userId,
      reason: dto.reason,
    });

    return updatedJob;
  }

  async cancelJob(id: string, organizationId: string, userId: string) {
    const job = await this.findOneMarketplaceJob(id, organizationId);

    if (['COMPLETED', 'CONFIRMED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException(`Cannot cancel job with status ${job.status}`);
    }

    // Cancel any pending dispatches
    await this.prisma.jobDispatch.updateMany({
      where: {
        marketplaceJobId: id,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Update vendor active jobs if assigned
    if (job.vendorProfileId && ['ACCEPTED', 'IN_PROGRESS'].includes(job.status)) {
      await this.prisma.vendorMarketplaceProfile.update({
        where: { id: job.vendorProfileId },
        data: {
          currentActiveJobs: { decrement: 1 },
        },
      });
    }

    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    this.logger.log('info', 'marketplace_job.cancelled', {
      jobId: id,
      organizationId,
      userId,
    });

    return updatedJob;
  }

  // ============================================================================
  // VENDOR RATING METHODS
  // ============================================================================

  async createVendorRating(
    dto: CreateVendorRatingDto,
    organizationId: string,
    userId: string,
    userName: string,
  ) {
    // Verify job exists and is confirmed
    const job = await this.prisma.marketplaceJob.findUnique({
      where: { id: dto.marketplaceJobId },
      include: {
        vendorProfile: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Marketplace job with ID ${dto.marketplaceJobId} not found`);
    }

    // Verify work order belongs to organization
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: job.workOrderId },
    });

    if (!workOrder || workOrder.organizationId !== organizationId) {
      throw new BadRequestException('Job does not belong to your organization');
    }

    if (job.status !== 'CONFIRMED') {
      throw new BadRequestException('Can only rate confirmed jobs');
    }

    if (!job.vendorProfileId) {
      throw new BadRequestException('No vendor assigned to this job');
    }

    // Check if rating already exists
    const existingRating = await this.prisma.vendorRating.findUnique({
      where: { marketplaceJobId: dto.marketplaceJobId },
    });

    if (existingRating) {
      throw new BadRequestException('A rating already exists for this job');
    }

    const rating = await this.prisma.vendorRating.create({
      data: {
        vendorProfileId: job.vendorProfileId,
        marketplaceJobId: dto.marketplaceJobId,
        overallRating: dto.overallRating,
        qualityRating: dto.qualityRating,
        communicationRating: dto.communicationRating,
        punctualityRating: dto.punctualityRating,
        valueRating: dto.valueRating,
        review: dto.review,
        photos: dto.photos || [],
        reviewerUserId: userId,
        reviewerName: userName,
        isPublic: dto.isPublic ?? true,
      },
    });

    // Update vendor's average rating
    const allRatings = await this.prisma.vendorRating.findMany({
      where: { vendorProfileId: job.vendorProfileId },
      select: { overallRating: true },
    });

    const avgRating = allRatings.reduce((sum, r) => sum + r.overallRating, 0) / allRatings.length;

    await this.prisma.vendorMarketplaceProfile.update({
      where: { id: job.vendorProfileId },
      data: { averageRating: avgRating },
    });

    this.logger.log('info', 'vendor_rating.created', {
      ratingId: rating.id,
      vendorProfileId: job.vendorProfileId,
      overallRating: dto.overallRating,
      organizationId,
      userId,
    });

    return rating;
  }

  async findAllVendorRatings(vendorProfileId: string, query?: VendorRatingQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { vendorProfileId };

    if (query?.minRating) {
      where.overallRating = { gte: query.minRating };
    }

    if (query?.publicOnly) {
      where.isPublic = true;
    }

    const [ratings, total] = await Promise.all([
      this.prisma.vendorRating.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorRating.count({ where }),
    ]);

    return {
      data: ratings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateVendorRating(id: string, dto: UpdateVendorRatingDto, userId: string) {
    const rating = await this.prisma.vendorRating.findUnique({
      where: { id },
    });

    if (!rating) {
      throw new NotFoundException(`Rating with ID ${id} not found`);
    }

    if (rating.reviewerUserId !== userId) {
      throw new BadRequestException('You can only update your own ratings');
    }

    return this.prisma.vendorRating.update({
      where: { id },
      data: dto,
    });
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  async getMarketplaceStats(organizationId: string) {
    // Get work order IDs for this organization first
    const orgWorkOrders = await this.prisma.workOrder.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const workOrderIds = orgWorkOrders.map((wo) => wo.id);

    if (workOrderIds.length === 0) {
      return {
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        totalSpend: 0,
        avgJobValue: 0,
        topVendors: [],
      };
    }

    const [totalJobs, activeJobs, completedJobs, totalSpend, avgJobValue, topVendors] =
      await Promise.all([
        this.prisma.marketplaceJob.count({
          where: {
            workOrderId: { in: workOrderIds },
          },
        }),
        this.prisma.marketplaceJob.count({
          where: {
            workOrderId: { in: workOrderIds },
            status: { in: ['PENDING_DISPATCH', 'DISPATCHED', 'ACCEPTED', 'IN_PROGRESS'] },
          },
        }),
        this.prisma.marketplaceJob.count({
          where: {
            workOrderId: { in: workOrderIds },
            status: 'CONFIRMED',
          },
        }),
        this.prisma.marketplaceJob.aggregate({
          where: {
            workOrderId: { in: workOrderIds },
            status: 'CONFIRMED',
          },
          _sum: { actualTotal: true },
        }),
        this.prisma.marketplaceJob.aggregate({
          where: {
            workOrderId: { in: workOrderIds },
            status: 'CONFIRMED',
          },
          _avg: { actualTotal: true },
        }),
        this.prisma.vendorMarketplaceProfile.findMany({
          where: {
            marketplaceJobs: {
              some: {
                workOrderId: { in: workOrderIds },
                status: 'CONFIRMED',
              },
            },
          },
          include: {
            vendor: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
          orderBy: {
            averageRating: 'desc',
          },
          take: 5,
        }),
      ]);

    // Count jobs per vendor separately
    const vendorJobCounts = await Promise.all(
      topVendors.map(async (v) => {
        const count = await this.prisma.marketplaceJob.count({
          where: {
            vendorProfileId: v.id,
            workOrderId: { in: workOrderIds },
            status: 'CONFIRMED',
          },
        });
        return { id: v.id, count };
      }),
    );

    const jobCountMap = new Map(vendorJobCounts.map((vc) => [vc.id, vc.count]));

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      totalSpend: totalSpend._sum?.actualTotal || 0,
      avgJobValue: avgJobValue._avg?.actualTotal || 0,
      topVendors: topVendors.map((v) => ({
        id: v.id,
        vendorId: v.vendor.id,
        companyName: v.vendor.companyName,
        averageRating: v.averageRating,
        jobsCompleted: jobCountMap.get(v.id) || 0,
      })),
    };
  }

  // ============================================================================
  // MULTI-VENDOR DISPATCH & MATCHING
  // ============================================================================

  /**
   * Dispatch job to multiple vendors simultaneously (first to accept wins)
   */
  async dispatchJobToMultipleVendors(
    jobId: string,
    vendorProfileIds: string[],
    organizationId: string,
    userId: string,
    responseDeadlineMinutes: number = 30,
  ) {
    const job = await this.findOneMarketplaceJob(jobId, organizationId);

    if (!['PENDING_DISPATCH', 'QUOTE_DECLINED'].includes(job.status)) {
      throw new BadRequestException(`Cannot dispatch job with status ${job.status}`);
    }

    // Verify all vendors exist and are active
    const vendors = await this.prisma.vendorMarketplaceProfile.findMany({
      where: {
        id: { in: vendorProfileIds },
        isMarketplaceActive: true,
        acceptingJobs: true,
      },
      include: { vendor: true },
    });

    if (vendors.length === 0) {
      throw new BadRequestException('No active vendors found from the provided IDs');
    }

    const responseDeadline = new Date(Date.now() + responseDeadlineMinutes * 60 * 1000);

    // Create dispatch records for all vendors
    const dispatches = await Promise.all(
      vendors.map((vendor) =>
        this.prisma.jobDispatch.create({
          data: {
            marketplaceJobId: jobId,
            vendorProfileId: vendor.id,
            status: 'PENDING',
            responseDeadline,
          },
        }),
      ),
    );

    // Update job status to DISPATCHED
    const updatedJob = await this.prisma.marketplaceJob.update({
      where: { id: jobId },
      data: {
        status: 'DISPATCHED',
      },
      include: {
        serviceCatalog: true,
        dispatches: {
          where: { status: 'PENDING' },
          include: {
            vendorProfile: {
              include: { vendor: true },
            },
          },
        },
      },
    });

    this.logger.log('info', 'marketplace_job.multi_dispatched', {
      jobId,
      vendorCount: vendors.length,
      vendorNames: vendors.map((v) => v.vendor.companyName),
      organizationId,
      userId,
    });

    return {
      job: updatedJob,
      dispatches,
      vendorsNotified: vendors.length,
    };
  }

  /**
   * Auto-match and dispatch to best vendors based on service type, location, and rating
   */
  async autoMatchAndDispatchVendors(
    jobId: string,
    organizationId: string,
    userId: string,
    maxVendors: number = 3,
  ) {
    const job = await this.findOneMarketplaceJob(jobId, organizationId);

    if (!['PENDING_DISPATCH', 'QUOTE_DECLINED'].includes(job.status)) {
      throw new BadRequestException(`Cannot dispatch job with status ${job.status}`);
    }

    // Get work order details for location matching
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: job.workOrderId },
      include: {
        property: {
          select: {
            zipCode: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Find matching vendors
    const matchedVendors = await this.findMatchingVendors(
      job.serviceCatalogId,
      workOrder.property.zipCode,
      maxVendors,
    );

    if (matchedVendors.length === 0) {
      throw new BadRequestException(
        'No matching vendors found. Try expanding search criteria or manually select vendors.',
      );
    }

    // Dispatch to matched vendors
    return this.dispatchJobToMultipleVendors(
      jobId,
      matchedVendors.map((v) => v.id),
      organizationId,
      userId,
    );
  }

  /**
   * Find matching vendors based on service type and location
   */
  private async findMatchingVendors(
    serviceCatalogId: string | null,
    propertyZipCode: string,
    limit: number = 5,
  ) {
    const where: any = {
      isMarketplaceActive: true,
      acceptingJobs: true,
    };

    // Match by service catalog if provided
    if (serviceCatalogId) {
      where.services = {
        some: {
          serviceCatalogId,
          isActive: true,
        },
      };
    }

    // Match by service area (zip code)
    where.serviceZipCodes = {
      has: propertyZipCode,
    };

    // Fetch vendors and sort by rating and availability
    const vendors = await this.prisma.vendorMarketplaceProfile.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: [
        { tier: 'desc' }, // PREMIUM > VERIFIED_PRICING > STANDARD
        { averageRating: 'desc' },
        { averageResponseMinutes: 'asc' },
      ],
      take: limit,
    });

    return vendors;
  }

  /**
   * Get available jobs for a specific vendor (jobs dispatched to them)
   */
  async getAvailableJobsForVendor(vendorProfileId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Find pending dispatches for this vendor
    const dispatches = await this.prisma.jobDispatch.findMany({
      where: {
        vendorProfileId,
        status: 'PENDING',
        responseDeadline: { gt: new Date() }, // Not expired
      },
      include: {
        marketplaceJob: {
          include: {
            serviceCatalog: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.jobDispatch.count({
      where: {
        vendorProfileId,
        status: 'PENDING',
        responseDeadline: { gt: new Date() },
      },
    });

    // Fetch work order details for each job
    const jobsWithDetails = await Promise.all(
      dispatches.map(async (dispatch) => {
        const workOrder = await this.prisma.workOrder.findUnique({
          where: { id: dispatch.marketplaceJob.workOrderId },
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address1: true,
                city: true,
                state: true,
                zipCode: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
              },
            },
          },
        });

        return {
          dispatch,
          job: dispatch.marketplaceJob,
          workOrder,
        };
      }),
    );

    return {
      data: jobsWithDetails,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get vendor's active jobs (accepted/in progress)
   */
  async getVendorActiveJobs(vendorProfileId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.marketplaceJob.findMany({
        where: {
          vendorProfileId,
          status: { in: ['ACCEPTED', 'IN_PROGRESS', 'QUOTE_SUBMITTED', 'QUOTE_APPROVED'] },
        },
        include: {
          serviceCatalog: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketplaceJob.count({
        where: {
          vendorProfileId,
          status: { in: ['ACCEPTED', 'IN_PROGRESS', 'QUOTE_SUBMITTED', 'QUOTE_APPROVED'] },
        },
      }),
    ]);

    // Fetch work order details
    const jobsWithDetails = await Promise.all(
      jobs.map(async (job) => {
        const workOrder = await this.prisma.workOrder.findUnique({
          where: { id: job.workOrderId },
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address1: true,
                city: true,
                state: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
              },
            },
          },
        });

        return { ...job, workOrder };
      }),
    );

    return {
      data: jobsWithDetails,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get vendor's completed jobs
   */
  async getVendorCompletedJobs(vendorProfileId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.marketplaceJob.findMany({
        where: {
          vendorProfileId,
          status: { in: ['COMPLETED', 'CONFIRMED'] },
        },
        include: {
          serviceCatalog: true,
          rating: true,
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketplaceJob.count({
        where: {
          vendorProfileId,
          status: { in: ['COMPLETED', 'CONFIRMED'] },
        },
      }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
