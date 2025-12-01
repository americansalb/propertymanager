import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

// Notification types matching the Prisma schema
type NotificationType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REMINDER'
  | 'AUTOPAY_UPCOMING'
  | 'AUTOPAY_PROCESSED'
  | 'AUTOPAY_FAILED'
  | 'LEASE_EXPIRING'
  | 'LEASE_EXPIRED'
  | 'LATE_FEE_APPLIED'
  | 'WORK_ORDER_UPDATE';

interface NotificationPayload {
  type: NotificationType;
  recipientEmail: string;
  recipientUserId?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  referenceType?: string;
  referenceId?: string;
  organizationId: string;
}

@Injectable()
export class NotificationsService {
  private readonly portalUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.portalUrl = this.configService.get<string>('FRONTEND_TENANT_URL') || 'http://localhost:3002';
  }

  /**
   * Create and queue a notification
   */
  async createNotification(payload: NotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        type: payload.type,
        status: 'PENDING',
        channel: 'EMAIL',
        recipientEmail: payload.recipientEmail,
        recipientUserId: payload.recipientUserId,
        subject: payload.subject,
        body: payload.body,
        htmlBody: payload.htmlBody,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
        organizationId: payload.organizationId,
      },
    });

    this.logger.log({
      message: 'notification.created',
      notificationId: notification.id,
      type: payload.type,
      recipient: payload.recipientEmail,
    });

    // Try to send immediately
    await this.sendNotification(notification.id);

    return notification;
  }

  /**
   * Send a pending notification
   */
  async sendNotification(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.status !== 'PENDING') {
      return;
    }

    try {
      // Send via EmailService
      const result = await this.emailService.sendEmail({
        to: notification.recipientEmail!,
        subject: notification.subject,
        text: notification.body,
        html: notification.htmlBody || undefined,
      });

      if (result.success) {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        this.logger.log({
          message: 'notification.sent',
          notificationId,
          type: notification.type,
          recipient: notification.recipientEmail,
          messageId: result.messageId,
        });
      } else {
        throw new Error(result.error || 'Email send failed');
      }
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
        },
      });

      this.logger.error({
        message: 'notification.send_failed',
        notificationId,
        error: (error as Error).message,
      });
    }
  }

  // ============================================================
  // HIGH-LEVEL NOTIFICATION METHODS
  // ============================================================

  /**
   * Send payment received confirmation
   */
  async sendPaymentReceivedNotification(
    tenantEmail: string,
    tenantName: string,
    amount: number,
    paymentDate: Date,
    propertyName: string,
    unitNumber: string,
    paymentId: string,
    organizationId: string,
  ) {
    // Send via EmailService directly for better templating
    const result = await this.emailService.sendPaymentReceivedEmail(
      tenantEmail,
      tenantName,
      amount,
      paymentDate,
      propertyName,
      unitNumber,
      paymentId.substring(0, 8).toUpperCase(),
    );

    // Also create notification record for tracking
    await this.prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: `Payment Received - ${this.formatCurrency(amount)}`,
        body: `Payment of ${this.formatCurrency(amount)} received`,
        referenceType: 'Payment',
        referenceId: paymentId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedNotification(
    tenantEmail: string,
    tenantName: string,
    amount: number,
    propertyName: string,
    unitNumber: string,
    reason: string,
    paymentId: string,
    organizationId: string,
  ) {
    const result = await this.emailService.sendPaymentFailedEmail(
      tenantEmail,
      tenantName,
      amount,
      propertyName,
      unitNumber,
      reason,
      this.portalUrl,
    );

    await this.prisma.notification.create({
      data: {
        type: 'PAYMENT_FAILED',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: 'Payment Failed - Action Required',
        body: `Payment of ${this.formatCurrency(amount)} failed: ${reason}`,
        referenceType: 'Payment',
        referenceId: paymentId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  /**
   * Send auto-pay upcoming notification (3 days before)
   */
  async sendAutoPayUpcomingNotification(
    tenantEmail: string,
    tenantName: string,
    amount: number,
    chargeDate: Date,
    propertyName: string,
    unitNumber: string,
    leaseId: string,
    organizationId: string,
  ) {
    const result = await this.emailService.sendAutoPayUpcomingEmail(
      tenantEmail,
      tenantName,
      amount,
      chargeDate,
      propertyName,
      unitNumber,
      this.portalUrl,
    );

    await this.prisma.notification.create({
      data: {
        type: 'AUTOPAY_UPCOMING',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: `Auto-Pay Scheduled - ${this.formatDate(chargeDate)}`,
        body: `Auto-pay of ${this.formatCurrency(amount)} scheduled for ${this.formatDate(chargeDate)}`,
        referenceType: 'Lease',
        referenceId: leaseId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  /**
   * Send auto-pay processed notification
   */
  async sendAutoPayProcessedNotification(
    tenantEmail: string,
    tenantName: string,
    amount: number,
    propertyName: string,
    unitNumber: string,
    paymentId: string,
    organizationId: string,
  ) {
    const result = await this.emailService.sendAutoPayProcessedEmail(
      tenantEmail,
      tenantName,
      amount,
      propertyName,
      unitNumber,
      paymentId.substring(0, 8).toUpperCase(),
    );

    await this.prisma.notification.create({
      data: {
        type: 'AUTOPAY_PROCESSED',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: `Auto-Pay Processed - ${this.formatCurrency(amount)}`,
        body: `Auto-pay of ${this.formatCurrency(amount)} processed successfully`,
        referenceType: 'Payment',
        referenceId: paymentId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  /**
   * Send rent due reminder
   */
  async sendRentDueReminderNotification(
    tenantEmail: string,
    tenantName: string,
    amount: number,
    dueDate: Date,
    propertyName: string,
    unitNumber: string,
    chargeId: string,
    organizationId: string,
  ) {
    const result = await this.emailService.sendRentDueReminderEmail(
      tenantEmail,
      tenantName,
      amount,
      dueDate,
      propertyName,
      unitNumber,
      this.portalUrl,
    );

    await this.prisma.notification.create({
      data: {
        type: 'PAYMENT_REMINDER',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: `Rent Due Reminder - ${this.formatDate(dueDate)}`,
        body: `Rent of ${this.formatCurrency(amount)} due on ${this.formatDate(dueDate)}`,
        referenceType: 'Charge',
        referenceId: chargeId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  /**
   * Send late fee applied notification
   */
  async sendLateFeeNotification(
    tenantEmail: string,
    tenantName: string,
    lateFeeAmount: number,
    totalDue: number,
    propertyName: string,
    unitNumber: string,
    chargeId: string,
    organizationId: string,
  ) {
    const result = await this.emailService.sendLateFeeAppliedEmail(
      tenantEmail,
      tenantName,
      lateFeeAmount,
      totalDue,
      propertyName,
      unitNumber,
      this.portalUrl,
    );

    await this.prisma.notification.create({
      data: {
        type: 'LATE_FEE_APPLIED',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: 'Late Fee Applied to Your Account',
        body: `Late fee of ${this.formatCurrency(lateFeeAmount)} applied. Total due: ${this.formatCurrency(totalDue)}`,
        referenceType: 'Charge',
        referenceId: chargeId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  /**
   * Send lease expiring notification
   */
  async sendLeaseExpiringNotification(
    tenantEmail: string,
    tenantName: string,
    expirationDate: Date,
    daysRemaining: number,
    propertyName: string,
    unitNumber: string,
    leaseId: string,
    organizationId: string,
  ) {
    // Get organization's contact email
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    const contactEmail = (org?.settings as { contactEmail?: string })?.contactEmail || 'support@propertymaster.io';

    const result = await this.emailService.sendLeaseExpiringEmail(
      tenantEmail,
      tenantName,
      expirationDate,
      daysRemaining,
      propertyName,
      unitNumber,
      contactEmail,
    );

    await this.prisma.notification.create({
      data: {
        type: 'LEASE_EXPIRING',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: `Lease Expiring in ${daysRemaining} Days`,
        body: `Your lease expires on ${this.formatDate(expirationDate)}`,
        referenceType: 'Lease',
        referenceId: leaseId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  /**
   * Send work order update notification
   */
  async sendWorkOrderUpdateNotification(
    tenantEmail: string,
    tenantName: string,
    workOrderTitle: string,
    newStatus: string,
    notes: string | null,
    propertyName: string,
    unitNumber: string,
    workOrderId: string,
    organizationId: string,
  ) {
    const result = await this.emailService.sendWorkOrderUpdateEmail(
      tenantEmail,
      tenantName,
      workOrderTitle,
      newStatus,
      notes,
      propertyName,
      unitNumber,
    );

    await this.prisma.notification.create({
      data: {
        type: 'WORK_ORDER_UPDATE',
        status: result.success ? 'SENT' : 'FAILED',
        channel: 'EMAIL',
        recipientEmail: tenantEmail,
        subject: `Work Order Update: ${workOrderTitle}`,
        body: `Work order status changed to: ${newStatus}`,
        referenceType: 'WorkOrder',
        referenceId: workOrderId,
        organizationId,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
      },
    });

    return result;
  }

  // ============================================================
  // NOTIFICATION QUERIES
  // ============================================================

  /**
   * Get notifications for a user
   */
  async getNotificationsForUser(userId: string, organizationId: string, limit: number = 50) {
    return this.prisma.notification.findMany({
      where: {
        recipientUserId: userId,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, organizationId: string) {
    return this.prisma.notification.count({
      where: {
        recipientUserId: userId,
        organizationId,
        status: { in: ['PENDING', 'SENT'] },
        readAt: null,
      },
    });
  }

  /**
   * Process pending notifications (called by scheduled task)
   */
  async processPendingNotifications() {
    const pendingNotifications = await this.prisma.notification.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          // Only process notifications created in the last 24 hours
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      take: 100,
    });

    let successCount = 0;
    let failCount = 0;

    for (const notification of pendingNotifications) {
      try {
        await this.sendNotification(notification.id);
        successCount++;
      } catch (error) {
        failCount++;
        this.logger.error({
          message: 'notification.process_failed',
          notificationId: notification.id,
          error: (error as Error).message,
        });
      }
    }

    this.logger.log({
      message: 'notifications.batch_processed',
      total: pendingNotifications.length,
      success: successCount,
      failed: failCount,
    });

    return { processed: pendingNotifications.length, success: successCount, failed: failCount };
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(organizationId: string) {
    const [total, pending, sent, failed, read] = await Promise.all([
      this.prisma.notification.count({ where: { organizationId } }),
      this.prisma.notification.count({ where: { organizationId, status: 'PENDING' } }),
      this.prisma.notification.count({ where: { organizationId, status: 'SENT' } }),
      this.prisma.notification.count({ where: { organizationId, status: 'FAILED' } }),
      this.prisma.notification.count({ where: { organizationId, status: 'READ' } }),
    ]);

    return { total, pending, sent, failed, read };
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(organizationId: string, limit: number = 50) {
    const failedNotifications = await this.prisma.notification.findMany({
      where: {
        organizationId,
        status: 'FAILED',
        createdAt: {
          // Only retry notifications from the last 7 days
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      take: limit,
    });

    // Reset status to PENDING and retry
    for (const notification of failedNotifications) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'PENDING', errorMessage: null },
      });
      await this.sendNotification(notification.id);
    }

    return { retried: failedNotifications.length };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
