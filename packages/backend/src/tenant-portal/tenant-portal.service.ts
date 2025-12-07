import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../payments/stripe.service';

@Injectable()
export class TenantPortalService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getDashboard(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            charges: {
              where: {
                status: { in: ['PENDING', 'POSTED', 'PARTIALLY_PAID'] },
              },
              orderBy: { dueDate: 'asc' },
            },
          },
        },
        payments: {
          take: 5,
          orderBy: { paymentDate: 'desc' },
        },
        maintenanceRequests: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          where: { isRead: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Calculate balance from lease charges
    const totalCharges =
      tenant.lease?.charges.reduce(
        (sum, charge) => sum + (Number(charge.amount) - Number(charge.amountPaid)),
        0,
      ) || 0;

    // Get next due charge
    const nextDueCharge = tenant.lease?.charges.find(
      (c) => c.status !== 'PAID' && c.status !== 'VOID',
    );

    // Get unit and property from direct assignment or lease
    const unitData = tenant.unit || tenant.lease?.unit;
    const propertyData = tenant.unit?.property || tenant.lease?.unit?.property;

    return {
      tenant: {
        id: tenant.id,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
      },
      lease: tenant.lease
        ? {
            id: tenant.lease.id,
            status: tenant.lease.status,
            startDate: tenant.lease.startDate,
            endDate: tenant.lease.endDate,
            monthlyRent: tenant.lease.monthlyRent,
            autoPayEnabled: tenant.lease.autoPayEnabled,
            autoPayDay: tenant.lease.autoPayDay,
          }
        : null,
      unit: unitData
        ? {
            id: unitData.id,
            unitNumber: unitData.unitNumber,
            bedrooms: unitData.bedrooms,
            bathrooms: unitData.bathrooms,
          }
        : null,
      property: propertyData
        ? {
            id: propertyData.id,
            name: propertyData.name,
            address1: propertyData.address1,
            city: propertyData.city,
            state: propertyData.state,
            zipCode: propertyData.zipCode,
          }
        : null,
      balance: totalCharges,
      nextDue: nextDueCharge
        ? {
            amount: Number(nextDueCharge.amount) - Number(nextDueCharge.amountPaid),
            dueDate: nextDueCharge.dueDate,
            type: nextDueCharge.type,
          }
        : null,
      recentPayments: tenant.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        date: p.paymentDate,
        status: p.status,
        method: p.method,
      })),
      activeMaintenanceRequests: tenant.maintenanceRequests.filter(
        (mr) => mr.status !== 'COMPLETED' && mr.status !== 'CANCELLED',
      ).length,
      unreadMessages: tenant.messages.length,
    };
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  async getPaymentHistory(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId },
        include: {
          allocations: {
            include: {
              charge: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { tenantId } }),
    ]);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        date: p.paymentDate,
        method: p.method,
        status: p.status,
        memo: p.memo,
        allocations: p.allocations.map((a) => ({
          amount: a.amount,
          chargeType: a.charge.type,
          chargeDescription: a.charge.description,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOutstandingCharges(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        lease: {
          include: {
            charges: {
              where: {
                status: { in: ['PENDING', 'POSTED', 'PARTIALLY_PAID'] },
              },
              orderBy: { dueDate: 'asc' },
            },
          },
        },
      },
    });

    if (!tenant?.lease) {
      return { charges: [], total: 0 };
    }

    const charges = tenant.lease.charges.map((c) => ({
      id: c.id,
      type: c.type,
      description: c.description,
      amount: c.amount,
      amountPaid: c.amountPaid,
      amountDue: Number(c.amount) - Number(c.amountPaid),
      dueDate: c.dueDate,
      status: c.status,
      isOverdue: new Date(c.dueDate) < new Date() && c.status !== 'PAID',
    }));

    const total = charges.reduce((sum, c) => sum + c.amountDue, 0);

    return { charges, total };
  }

  async getAutoPaySettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        lease: true,
      },
    });

    if (!tenant?.lease) {
      throw new NotFoundException('Lease not found');
    }

    return {
      enabled: tenant.lease.autoPayEnabled,
      day: tenant.lease.autoPayDay,
      hasPaymentMethod: !!tenant.lease.autoPayPaymentMethodId,
    };
  }

  async updateAutoPaySettings(tenantId: string, enabled: boolean, day?: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { lease: true },
    });

    if (!tenant?.lease) {
      throw new NotFoundException('Lease not found');
    }

    if (enabled && !tenant.lease.autoPayPaymentMethodId) {
      throw new BadRequestException('Please add a payment method before enabling auto-pay');
    }

    await this.prisma.lease.update({
      where: { id: tenant.leaseId },
      data: {
        autoPayEnabled: enabled,
        autoPayDay: day || tenant.lease.autoPayDay,
      },
    });

    return { success: true };
  }

  async createPaymentIntent(tenantId: string, chargeIds: string[], amount: number) {
    // Verify tenant exists and has a lease
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            charges: {
              where: {
                id: { in: chargeIds },
                status: { in: ['POSTED', 'PARTIALLY_PAID'] },
              },
            },
          },
        },
      },
    });

    if (!tenant?.lease) {
      throw new NotFoundException('Lease not found');
    }

    // Verify all charges belong to this tenant's lease
    if (tenant.lease.charges.length !== chargeIds.length) {
      throw new BadRequestException('One or more charges are invalid or already paid');
    }

    // Verify the amount matches the outstanding balance
    const totalOutstanding = tenant.lease.charges.reduce((sum, charge) => {
      const balance = Number(charge.amount) - Number(charge.amountPaid);
      return sum + balance;
    }, 0);

    if (amount > totalOutstanding + 0.01) {
      throw new BadRequestException('Payment amount exceeds outstanding balance');
    }

    // Check if Stripe is configured
    if (!this.stripeService.isConfigured()) {
      throw new BadRequestException(
        'Payment processing is not configured. Please contact support.',
      );
    }

    // Create the payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      tenantId,
      chargeIds,
      {
        propertyName: tenant.lease.unit.property.name,
        unitNumber: tenant.lease.unit.unitNumber,
      },
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    };
  }

  // ============================================================================
  // MAINTENANCE REQUESTS
  // ============================================================================

  async getMaintenanceRequests(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const requests = await this.prisma.maintenanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      status: r.status,
      location: r.location,
      photos: r.photos,
      permissionToEnter: r.permissionToEnter,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      resolution: r.resolution,
    }));
  }

  async createMaintenanceRequest(
    tenantId: string,
    data: {
      title: string;
      description: string;
      category: string;
      priority?: string;
      location?: string;
      permissionToEnter?: boolean;
      preferredTimes?: string;
      photos?: string[];
    },
  ) {
    // Verify tenant exists and has unit assignment (either direct or via lease)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    // Get unit from direct assignment or lease
    const unitData = tenant?.unit || tenant?.lease?.unit;
    const propertyData = tenant?.unit?.property || tenant?.lease?.unit?.property;

    if (!tenant || !unitData || !propertyData) {
      throw new BadRequestException('No unit assignment found');
    }

    // Check if tenant is active
    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException('Tenant is not active');
    }

    const request = await this.prisma.maintenanceRequest.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: (data.priority as any) || 'MEDIUM',
        location: data.location,
        permissionToEnter: data.permissionToEnter || false,
        preferredTimes: data.preferredTimes,
        photos: data.photos || [],
      },
    });

    // Also create a work order for management
    await this.prisma.workOrder.create({
      data: {
        organizationId: propertyData.organizationId,
        title: data.title,
        description: data.description,
        type: 'MAINTENANCE',
        priority: (data.priority as any) || 'MEDIUM',
        status: 'SUBMITTED',
        propertyId: propertyData.id,
        unitId: unitData.id,
        location: data.location,
        tenantReportedBy: `${tenant.firstName} ${tenant.lastName}`,
        tenantPhone: tenant.phone,
        permissionToEnter: data.permissionToEnter || false,
      },
    });

    return request;
  }

  async getMaintenanceRequest(tenantId: string, requestId: string) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: {
        id: requestId,
        tenantId,
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    return request;
  }

  // ============================================================================
  // LEASE
  // ============================================================================

  async getLeaseDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            tenants: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isPrimary: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get unit and property from direct assignment or lease
    const unitData = tenant.unit || tenant.lease?.unit;
    const propertyData = tenant.unit?.property || tenant.lease?.unit?.property;

    // If tenant has a lease, return full lease details
    if (tenant.lease) {
      const lease = tenant.lease;
      return {
        id: lease.id,
        status: lease.status,
        type: lease.type,
        startDate: lease.startDate,
        endDate: lease.endDate,
        moveInDate: lease.moveInDate,
        monthlyRent: lease.monthlyRent,
        securityDeposit: lease.securityDeposit,
        terms: lease.terms,
        documentUrl: lease.documentUrl,
        unit: {
          id: lease.unit.id,
          unitNumber: lease.unit.unitNumber,
          bedrooms: lease.unit.bedrooms,
          bathrooms: lease.unit.bathrooms,
          squareFeet: lease.unit.squareFeet,
          type: lease.unit.type,
        },
        property: {
          id: lease.unit.property.id,
          name: lease.unit.property.name,
          address1: lease.unit.property.address1,
          address2: lease.unit.property.address2,
          city: lease.unit.property.city,
          state: lease.unit.property.state,
          zipCode: lease.unit.property.zipCode,
          type: lease.unit.property.type,
        },
        tenants: lease.tenants,
        daysRemaining: lease.endDate
          ? Math.max(
              0,
              Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            )
          : null,
      };
    }

    // If no lease but has direct unit assignment, return unit info only
    if (unitData && propertyData) {
      return {
        id: null,
        status: 'NO_LEASE',
        type: null,
        startDate: tenant.moveInDate,
        endDate: null,
        moveInDate: tenant.moveInDate,
        monthlyRent: null,
        securityDeposit: null,
        terms: null,
        documentUrl: null,
        unit: {
          id: unitData.id,
          unitNumber: unitData.unitNumber,
          bedrooms: unitData.bedrooms,
          bathrooms: unitData.bathrooms,
          squareFeet: unitData.squareFeet,
          type: unitData.type,
        },
        property: {
          id: propertyData.id,
          name: propertyData.name,
          address1: propertyData.address1,
          address2: propertyData.address2,
          city: propertyData.city,
          state: propertyData.state,
          zipCode: propertyData.zipCode,
          type: propertyData.type,
        },
        tenants: [
          {
            id: tenant.id,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            email: tenant.email,
            isPrimary: tenant.isPrimary,
          },
        ],
        daysRemaining: null,
      };
    }

    throw new NotFoundException('No unit assignment found');
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  async getMessages(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.tenantMessage.findMany({
        where: {
          tenantId,
          parentId: null, // Only top-level messages
        },
        include: {
          replies: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenantMessage.count({
        where: { tenantId, parentId: null },
      }),
    ]);

    return {
      messages: messages.map((m) => ({
        id: m.id,
        subject: m.subject,
        content: m.content,
        direction: m.direction,
        isRead: m.isRead,
        senderName: m.senderName,
        createdAt: m.createdAt,
        replies: m.replies.map((r) => ({
          id: r.id,
          content: r.content,
          direction: r.direction,
          senderName: r.senderName,
          createdAt: r.createdAt,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async sendMessage(
    tenantId: string,
    data: { subject?: string; content: string; parentId?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const message = await this.prisma.tenantMessage.create({
      data: {
        tenantId,
        direction: 'TENANT_TO_MANAGEMENT',
        subject: data.subject,
        content: data.content,
        parentId: data.parentId,
        senderName: `${tenant.firstName} ${tenant.lastName}`,
      },
    });

    return message;
  }

  async markMessageAsRead(tenantId: string, messageId: string) {
    const message = await this.prisma.tenantMessage.findFirst({
      where: {
        id: messageId,
        tenantId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.prisma.tenantMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  async getUnreadCount(tenantId: string) {
    const count = await this.prisma.tenantMessage.count({
      where: {
        tenantId,
        isRead: false,
        direction: 'MANAGEMENT_TO_TENANT',
      },
    });

    return { count };
  }
}
