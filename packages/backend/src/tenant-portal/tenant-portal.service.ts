import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HelcimService } from '../payments/helcim.service';

@Injectable()
export class TenantPortalService {
  constructor(
    private prisma: PrismaService,
    private helcimService: HelcimService,
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
      // Return disabled state when no lease exists
      return {
        enabled: false,
        day: null,
        hasPaymentMethod: false,
        available: false,
        message: 'Auto-pay is not available without an active lease.',
      };
    }

    return {
      enabled: tenant.lease.autoPayEnabled,
      day: tenant.lease.autoPayDay,
      hasPaymentMethod: !!tenant.lease.autoPayPaymentMethodId,
      available: true,
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
      where: { id: tenant.lease.id },
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

    // Check if Helcim is configured
    if (!this.helcimService.checkConfigured()) {
      throw new BadRequestException(
        'Payment processing is not configured. Please contact support.',
      );
    }

    // Initialize Helcim checkout session
    const checkout = await this.helcimService.initializeCheckout(amount, tenantId, chargeIds, {
      propertyName: tenant.lease.unit.property.name,
      unitNumber: tenant.lease.unit.unitNumber,
    });

    return {
      checkoutToken: checkout.checkoutToken,
      secretToken: checkout.secretToken,
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
      include: {
        tenant: {
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
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    // Get the related work order to show management's progress
    const unit = request.tenant?.unit || request.tenant?.lease?.unit;
    const property = request.tenant?.unit?.property || request.tenant?.lease?.unit?.property;

    let workOrderStatus = null;
    if (property) {
      const workOrder = await this.prisma.workOrder.findFirst({
        where: {
          organizationId: property.organizationId,
          title: request.title,
          propertyId: property.id,
          createdAt: {
            gte: new Date(new Date(request.createdAt).getTime() - 60000), // Within 1 minute of request
          },
        },
        include: {
          assignedTo: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          vendor: {
            select: {
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (workOrder) {
        workOrderStatus = {
          status: workOrder.status,
          assignedTo: workOrder.assignedTo
            ? `${workOrder.assignedTo.firstName} ${workOrder.assignedTo.lastName}`
            : null,
          vendor: workOrder.vendor?.companyName || null,
          scheduledDate: workOrder.scheduledDate,
          completedDate: workOrder.completedDate,
          completionNotes: workOrder.completionNotes,
          estimatedCost: workOrder.estimatedCost,
        };
      }
    }

    return {
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority,
      status: request.status,
      location: request.location,
      photos: request.photos,
      permissionToEnter: request.permissionToEnter,
      preferredTimes: request.preferredTimes,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      resolvedAt: request.resolvedAt,
      resolution: request.resolution,
      unit: unit
        ? {
            id: unit.id,
            unitNumber: unit.unitNumber,
          }
        : null,
      property: property
        ? {
            id: property.id,
            name: property.name,
            address1: property.address1,
            city: property.city,
            state: property.state,
          }
        : null,
      workOrder: workOrderStatus,
    };
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

    // No lease and no unit - return a "no lease" response instead of error
    return {
      id: null,
      status: 'NO_LEASE',
      type: null,
      startDate: null,
      endDate: null,
      moveInDate: null,
      monthlyRent: null,
      securityDeposit: null,
      terms: null,
      documentUrl: null,
      unit: null,
      property: null,
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
      message: 'No lease or unit assignment found. Please contact your property manager.',
    };
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

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  async getDocuments(tenantId: string, type?: string) {
    const where: any = { tenantId, isVisibleToTenant: true };
    if (type) {
      where.type = type;
    }

    const documents = await this.prisma.tenantDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      type: d.type,
      mimeType: d.mimeType,
      size: d.size,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt,
    }));
  }

  async getDocumentDownloadUrl(tenantId: string, documentId: string) {
    const document = await this.prisma.tenantDocument.findFirst({
      where: {
        id: documentId,
        tenantId,
        isVisibleToTenant: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      url: document.storageUrl,
      name: document.name,
      mimeType: document.mimeType,
    };
  }

  async uploadDocument(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      type: string;
      storageKey: string;
      storageUrl: string;
      mimeType: string;
      size: number;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const document = await this.prisma.tenantDocument.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        type: data.type as any,
        storageKey: data.storageKey,
        storageUrl: data.storageUrl,
        mimeType: data.mimeType,
        size: data.size,
        uploadedBy: 'TENANT',
        isVisibleToTenant: true,
      },
    });

    return document;
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  async getNotifications(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.tenantNotification.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenantNotification.count({ where: { tenantId } }),
      this.prisma.tenantNotification.count({ where: { tenantId, isRead: false } }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        referenceType: n.referenceType,
        referenceId: n.referenceId,
        actionUrl: n.actionUrl,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  async getNotificationUnreadCount(tenantId: string) {
    const count = await this.prisma.tenantNotification.count({
      where: { tenantId, isRead: false },
    });

    return { count };
  }

  async markNotificationAsRead(tenantId: string, notificationId: string) {
    const notification = await this.prisma.tenantNotification.findFirst({
      where: { id: notificationId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.tenantNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    return { success: true };
  }

  async markAllNotificationsAsRead(tenantId: string) {
    await this.prisma.tenantNotification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { success: true };
  }

  async deleteNotification(tenantId: string, notificationId: string) {
    const notification = await this.prisma.tenantNotification.findFirst({
      where: { id: notificationId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.tenantNotification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  // Helper method to create notifications (used by other services)
  async createNotification(
    tenantId: string,
    type: string,
    title: string,
    message: string,
    options?: {
      referenceType?: string;
      referenceId?: string;
      actionUrl?: string;
    },
  ) {
    return this.prisma.tenantNotification.create({
      data: {
        tenantId,
        type: type as any,
        title,
        message,
        referenceType: options?.referenceType,
        referenceId: options?.referenceId,
        actionUrl: options?.actionUrl,
      },
    });
  }

  // ============================================================================
  // PAYMENT RECEIPTS & EXPORTS
  // ============================================================================

  async getPaymentReceipt(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        tenant: {
          include: {
            unit: { include: { property: true } },
            lease: { include: { unit: { include: { property: true } } } },
          },
        },
        allocations: {
          include: { charge: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const unit = payment.tenant.unit || payment.tenant.lease?.unit;
    const property = payment.tenant.unit?.property || payment.tenant.lease?.unit?.property;

    return {
      id: payment.id,
      receiptNumber: `RCP-${payment.id.slice(-8).toUpperCase()}`,
      date: payment.paymentDate,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      tenant: {
        name: `${payment.tenant.firstName} ${payment.tenant.lastName}`,
        email: payment.tenant.email,
      },
      property: property
        ? {
            name: property.name,
            address: `${property.address1}, ${property.city}, ${property.state} ${property.zipCode}`,
          }
        : null,
      unit: unit ? { unitNumber: unit.unitNumber } : null,
      allocations: payment.allocations.map((a) => ({
        description: a.charge.description,
        type: a.charge.type,
        amount: a.amount,
      })),
      transactionId: payment.helcimTransactionId || payment.stripePaymentIntentId || null,
    };
  }

  async exportPaymentHistory(tenantId: string, format: 'csv' | 'json', year?: number) {
    const whereClause: any = { tenantId };

    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      whereClause.paymentDate = {
        gte: startDate,
        lt: endDate,
      };
    }

    const payments = await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        allocations: {
          include: { charge: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    if (format === 'csv') {
      const headers = ['Date', 'Amount', 'Method', 'Status', 'Description', 'Transaction ID'];
      const rows = payments.map((p) => [
        new Date(p.paymentDate).toISOString().split('T')[0],
        Number(p.amount).toFixed(2),
        p.method,
        p.status,
        p.allocations.map((a) => a.charge.description).join('; '),
        p.helcimTransactionId || p.stripePaymentIntentId || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return {
        content: csvContent,
        filename: `payment-history${year ? `-${year}` : ''}.csv`,
        mimeType: 'text/csv',
      };
    }

    return {
      content: JSON.stringify(payments, null, 2),
      filename: `payment-history${year ? `-${year}` : ''}.json`,
      mimeType: 'application/json',
    };
  }

  async getAnnualStatement(tenantId: string, year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        unit: { include: { property: true } },
        lease: { include: { unit: { include: { property: true } } } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        paymentDate: { gte: startDate, lt: endDate },
      },
      include: {
        allocations: { include: { charge: true } },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const unit = tenant.unit || tenant.lease?.unit;
    const property = tenant.unit?.property || tenant.lease?.unit?.property;

    // Summarize by charge type
    const summary: Record<string, number> = {};
    payments.forEach((p) => {
      p.allocations.forEach((a) => {
        const type = a.charge.type;
        summary[type] = (summary[type] || 0) + Number(a.amount);
      });
    });

    return {
      year,
      tenant: {
        name: `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
      },
      property: property
        ? {
            name: property.name,
            address: `${property.address1}, ${property.city}, ${property.state} ${property.zipCode}`,
          }
        : null,
      unit: unit ? { unitNumber: unit.unitNumber } : null,
      payments: payments.map((p) => ({
        date: p.paymentDate,
        amount: p.amount,
        method: p.method,
        allocations: p.allocations.map((a) => ({
          type: a.charge.type,
          description: a.charge.description,
          amount: a.amount,
        })),
      })),
      summary,
      totalPaid: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // MAINTENANCE FEEDBACK
  // ============================================================================

  async submitMaintenanceFeedback(
    tenantId: string,
    requestId: string,
    data: {
      overallRating: number;
      qualityRating?: number;
      timelinessRating?: number;
      communicationRating?: number;
      comment?: string;
      wouldRecommend?: boolean;
      issueResolved?: boolean;
      followUpRequested?: boolean;
      followUpReason?: string;
    },
  ) {
    // Verify the maintenance request belongs to this tenant and is completed
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { feedback: true },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (request.status !== 'COMPLETED') {
      throw new BadRequestException('Feedback can only be submitted for completed requests');
    }

    if (request.feedback) {
      throw new BadRequestException('Feedback has already been submitted for this request');
    }

    const feedback = await this.prisma.maintenanceFeedback.create({
      data: {
        maintenanceRequestId: requestId,
        overallRating: data.overallRating,
        qualityRating: data.qualityRating,
        timelinessRating: data.timelinessRating,
        communicationRating: data.communicationRating,
        comment: data.comment,
        wouldRecommend: data.wouldRecommend,
        issueResolved: data.issueResolved ?? true,
        followUpRequested: data.followUpRequested ?? false,
        followUpReason: data.followUpReason,
      },
    });

    // If follow-up is requested, create a notification or flag
    if (data.followUpRequested) {
      // Could trigger a new maintenance request or notification to management
      await this.createNotification(
        tenantId,
        'MAINTENANCE_UPDATE',
        'Follow-up Requested',
        `A follow-up has been requested for maintenance request: ${request.title}`,
        { referenceType: 'MAINTENANCE', referenceId: requestId, actionUrl: `/maintenance/${requestId}` },
      );
    }

    return feedback;
  }

  async getMaintenanceFeedback(tenantId: string, requestId: string) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { feedback: true },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    return request.feedback;
  }

  async updateMaintenanceFeedback(
    tenantId: string,
    requestId: string,
    data: {
      overallRating?: number;
      qualityRating?: number;
      timelinessRating?: number;
      communicationRating?: number;
      comment?: string;
      wouldRecommend?: boolean;
    },
  ) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { feedback: true },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (!request.feedback) {
      throw new NotFoundException('No feedback exists for this request');
    }

    const feedback = await this.prisma.maintenanceFeedback.update({
      where: { id: request.feedback.id },
      data: {
        overallRating: data.overallRating,
        qualityRating: data.qualityRating,
        timelinessRating: data.timelinessRating,
        communicationRating: data.communicationRating,
        comment: data.comment,
        wouldRecommend: data.wouldRecommend,
      },
    });

    return feedback;
  }

  async requestMaintenanceFollowUp(
    tenantId: string,
    requestId: string,
    reason: string,
  ) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { feedback: true },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    // Update feedback if exists
    if (request.feedback) {
      await this.prisma.maintenanceFeedback.update({
        where: { id: request.feedback.id },
        data: {
          followUpRequested: true,
          followUpReason: reason,
        },
      });
    }

    // Create a new maintenance request referencing the original
    const followUp = await this.prisma.maintenanceRequest.create({
      data: {
        tenantId,
        title: `Follow-up: ${request.title}`,
        description: `Follow-up request for previous issue.\n\nReason: ${reason}\n\nOriginal request ID: ${requestId}`,
        category: request.category,
        priority: request.priority,
        location: request.location,
        permissionToEnter: request.permissionToEnter,
      },
    });

    return followUp;
  }

  // ============================================================================
  // LEASE RENEWAL
  // ============================================================================

  async getRenewalOffers(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { lease: true },
    });

    if (!tenant?.lease) {
      return { offers: [] };
    }

    const offers = await this.prisma.leaseRenewalOffer.findMany({
      where: {
        leaseId: tenant.lease.id,
        status: { in: ['PENDING', 'COUNTER_OFFERED'] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentLease = tenant.lease;

    return {
      offers: offers.map((o) => ({
        id: o.id,
        status: o.status,
        newMonthlyRent: o.newMonthlyRent,
        newStartDate: o.newStartDate,
        newEndDate: o.newEndDate,
        newLeaseType: o.newLeaseType,
        rentChangeAmount: o.rentChangeAmount,
        rentChangePercent: o.rentChangePercent,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
      })),
      currentLease: {
        id: currentLease.id,
        monthlyRent: currentLease.monthlyRent,
        startDate: currentLease.startDate,
        endDate: currentLease.endDate,
        type: currentLease.type,
      },
    };
  }

  async getRenewalOfferDetails(tenantId: string, offerId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { lease: true },
    });

    if (!tenant?.lease) {
      throw new NotFoundException('No active lease found');
    }

    const offer = await this.prisma.leaseRenewalOffer.findFirst({
      where: {
        id: offerId,
        leaseId: tenant.lease.id,
      },
      include: {
        lease: {
          include: {
            unit: { include: { property: true } },
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Renewal offer not found');
    }

    return {
      id: offer.id,
      status: offer.status,
      newMonthlyRent: offer.newMonthlyRent,
      newStartDate: offer.newStartDate,
      newEndDate: offer.newEndDate,
      newLeaseType: offer.newLeaseType,
      rentChangeAmount: offer.rentChangeAmount,
      rentChangePercent: offer.rentChangePercent,
      expiresAt: offer.expiresAt,
      respondedAt: offer.respondedAt,
      tenantResponse: offer.tenantResponse,
      tenantNotes: offer.tenantNotes,
      counterOfferRent: offer.counterOfferRent,
      counterOfferNotes: offer.counterOfferNotes,
      createdAt: offer.createdAt,
      currentLease: {
        id: offer.lease.id,
        monthlyRent: offer.lease.monthlyRent,
        startDate: offer.lease.startDate,
        endDate: offer.lease.endDate,
        type: offer.lease.type,
      },
      property: offer.lease.unit.property
        ? {
            name: offer.lease.unit.property.name,
            address: `${offer.lease.unit.property.address1}, ${offer.lease.unit.property.city}, ${offer.lease.unit.property.state}`,
          }
        : null,
      unit: {
        unitNumber: offer.lease.unit.unitNumber,
      },
    };
  }

  async respondToRenewalOffer(
    tenantId: string,
    offerId: string,
    data: {
      response: 'ACCEPT' | 'DECLINE' | 'COUNTER' | 'MOVE_OUT';
      notes?: string;
      counterOfferRent?: number;
      counterOfferNotes?: string;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { lease: true },
    });

    if (!tenant?.lease) {
      throw new NotFoundException('No active lease found');
    }

    const offer = await this.prisma.leaseRenewalOffer.findFirst({
      where: {
        id: offerId,
        leaseId: tenant.lease.id,
        status: { in: ['PENDING', 'COUNTER_OFFERED'] },
        expiresAt: { gt: new Date() },
      },
    });

    if (!offer) {
      throw new NotFoundException('Renewal offer not found or has expired');
    }

    // Determine new status based on response
    let newStatus: string;
    switch (data.response) {
      case 'ACCEPT':
        newStatus = 'ACCEPTED';
        break;
      case 'DECLINE':
      case 'MOVE_OUT':
        newStatus = 'DECLINED';
        break;
      case 'COUNTER':
        if (!data.counterOfferRent) {
          throw new BadRequestException('Counter offer rent amount is required');
        }
        newStatus = 'COUNTER_OFFERED';
        break;
      default:
        throw new BadRequestException('Invalid response');
    }

    const updatedOffer = await this.prisma.leaseRenewalOffer.update({
      where: { id: offerId },
      data: {
        status: newStatus as any,
        tenantResponse: data.response as any,
        tenantNotes: data.notes,
        respondedAt: new Date(),
        counterOfferRent: data.counterOfferRent,
        counterOfferNotes: data.counterOfferNotes,
      },
    });

    // Create notification about the response
    await this.createNotification(
      tenantId,
      'LEASE_RENEWED',
      'Renewal Response Submitted',
      `Your response to the lease renewal offer has been submitted: ${data.response}`,
      { referenceType: 'LEASE', referenceId: offerId, actionUrl: '/lease/renewal' },
    );

    return updatedOffer;
  }
}
