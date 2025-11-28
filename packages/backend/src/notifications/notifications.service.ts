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

interface EmailTemplate {
  subject: string;
  body: string;
  htmlBody: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

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
      // Send email using the EmailService
      const emailSent = await this.emailService.sendEmail({
        to: notification.recipientEmail!,
        subject: notification.subject,
        text: notification.body,
        html: notification.htmlBody || undefined,
      });

      if (emailSent) {
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
        });
      } else {
        throw new Error('Email service returned false');
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
  // PAYMENT NOTIFICATION TEMPLATES (Phase 72)
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
    const template = this.getPaymentReceivedTemplate(
      tenantName,
      amount,
      paymentDate,
      propertyName,
      unitNumber,
    );

    return this.createNotification({
      type: 'PAYMENT_RECEIVED',
      recipientEmail: tenantEmail,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody,
      referenceType: 'Payment',
      referenceId: paymentId,
      organizationId,
    });
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
    const template = this.getPaymentFailedTemplate(
      tenantName,
      amount,
      propertyName,
      unitNumber,
      reason,
    );

    return this.createNotification({
      type: 'PAYMENT_FAILED',
      recipientEmail: tenantEmail,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody,
      referenceType: 'Payment',
      referenceId: paymentId,
      organizationId,
    });
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
    const template = this.getAutoPayUpcomingTemplate(
      tenantName,
      amount,
      chargeDate,
      propertyName,
      unitNumber,
    );

    return this.createNotification({
      type: 'AUTOPAY_UPCOMING',
      recipientEmail: tenantEmail,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody,
      referenceType: 'Lease',
      referenceId: leaseId,
      organizationId,
    });
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
    const template = this.getAutoPayProcessedTemplate(tenantName, amount, propertyName, unitNumber);

    return this.createNotification({
      type: 'AUTOPAY_PROCESSED',
      recipientEmail: tenantEmail,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody,
      referenceType: 'Payment',
      referenceId: paymentId,
      organizationId,
    });
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
    const template = this.getRentDueReminderTemplate(
      tenantName,
      amount,
      dueDate,
      propertyName,
      unitNumber,
    );

    return this.createNotification({
      type: 'PAYMENT_REMINDER',
      recipientEmail: tenantEmail,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody,
      referenceType: 'Charge',
      referenceId: chargeId,
      organizationId,
    });
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
    const template = this.getLeaseExpiringTemplate(
      tenantName,
      expirationDate,
      daysRemaining,
      propertyName,
      unitNumber,
    );

    return this.createNotification({
      type: 'LEASE_EXPIRING',
      recipientEmail: tenantEmail,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody,
      referenceType: 'Lease',
      referenceId: leaseId,
      organizationId,
    });
  }

  // ============================================================
  // EMAIL TEMPLATES
  // ============================================================

  private getPaymentReceivedTemplate(
    tenantName: string,
    amount: number,
    paymentDate: Date,
    propertyName: string,
    unitNumber: string,
  ): EmailTemplate {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    const formattedDate = paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      subject: `Payment Received - ${formattedAmount}`,
      body: `Dear ${tenantName},

We have received your payment of ${formattedAmount} on ${formattedDate}.

Property: ${propertyName}
Unit: ${unitNumber}
Amount: ${formattedAmount}
Date: ${formattedDate}

Thank you for your payment!

Best regards,
Property Management Team`,
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #10b981; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Received</h1>
    </div>
    <div class="content">
      <p>Dear ${tenantName},</p>
      <p>We have received your payment. Thank you!</p>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
        <p><strong>Amount:</strong> <span class="amount">${formattedAmount}</span></p>
        <p><strong>Date:</strong> ${formattedDate}</p>
      </div>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  </div>
</body>
</html>`,
    };
  }

  private getPaymentFailedTemplate(
    tenantName: string,
    amount: number,
    propertyName: string,
    unitNumber: string,
    reason: string,
  ): EmailTemplate {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    return {
      subject: `Payment Failed - Action Required`,
      body: `Dear ${tenantName},

Unfortunately, your payment of ${formattedAmount} could not be processed.

Property: ${propertyName}
Unit: ${unitNumber}
Amount: ${formattedAmount}
Reason: ${reason}

Please update your payment method or try again.

Best regards,
Property Management Team`,
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Failed</h1>
    </div>
    <div class="content">
      <p>Dear ${tenantName},</p>
      <div class="alert">
        <p>Your payment of <strong>${formattedAmount}</strong> could not be processed.</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
      </div>
      <p>Please update your payment method or try again.</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  </div>
</body>
</html>`,
    };
  }

  private getAutoPayUpcomingTemplate(
    tenantName: string,
    amount: number,
    chargeDate: Date,
    propertyName: string,
    unitNumber: string,
  ): EmailTemplate {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    const formattedDate = chargeDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      subject: `Auto-Pay Scheduled - ${formattedDate}`,
      body: `Dear ${tenantName},

This is a reminder that your auto-pay of ${formattedAmount} will be processed on ${formattedDate}.

Property: ${propertyName}
Unit: ${unitNumber}
Amount: ${formattedAmount}
Scheduled Date: ${formattedDate}

If you need to make any changes, please update your payment settings before the scheduled date.

Best regards,
Property Management Team`,
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Auto-Pay Reminder</h1>
    </div>
    <div class="content">
      <p>Dear ${tenantName},</p>
      <div class="info">
        <p>Your auto-pay of <strong>${formattedAmount}</strong> will be processed on <strong>${formattedDate}</strong>.</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
      </div>
      <p>If you need to make any changes, please update your payment settings before the scheduled date.</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  </div>
</body>
</html>`,
    };
  }

  private getAutoPayProcessedTemplate(
    tenantName: string,
    amount: number,
    propertyName: string,
    unitNumber: string,
  ): EmailTemplate {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    return {
      subject: `Auto-Pay Processed - ${formattedAmount}`,
      body: `Dear ${tenantName},

Your auto-pay of ${formattedAmount} has been successfully processed.

Property: ${propertyName}
Unit: ${unitNumber}
Amount: ${formattedAmount}

Thank you for using auto-pay!

Best regards,
Property Management Team`,
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .success { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Auto-Pay Processed</h1>
    </div>
    <div class="content">
      <p>Dear ${tenantName},</p>
      <div class="success">
        <p>Your auto-pay of <strong>${formattedAmount}</strong> has been successfully processed.</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
      </div>
      <p>Thank you for using auto-pay!</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  </div>
</body>
</html>`,
    };
  }

  private getRentDueReminderTemplate(
    tenantName: string,
    amount: number,
    dueDate: Date,
    propertyName: string,
    unitNumber: string,
  ): EmailTemplate {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    const formattedDate = dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      subject: `Rent Due Reminder - ${formattedDate}`,
      body: `Dear ${tenantName},

This is a friendly reminder that your rent payment of ${formattedAmount} is due on ${formattedDate}.

Property: ${propertyName}
Unit: ${unitNumber}
Amount Due: ${formattedAmount}
Due Date: ${formattedDate}

Please make your payment to avoid late fees.

Best regards,
Property Management Team`,
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .reminder { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rent Due Reminder</h1>
    </div>
    <div class="content">
      <p>Dear ${tenantName},</p>
      <div class="reminder">
        <p>Your rent payment of <strong>${formattedAmount}</strong> is due on <strong>${formattedDate}</strong>.</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
      </div>
      <p>Please make your payment to avoid late fees.</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  </div>
</body>
</html>`,
    };
  }

  private getLeaseExpiringTemplate(
    tenantName: string,
    expirationDate: Date,
    daysRemaining: number,
    propertyName: string,
    unitNumber: string,
  ): EmailTemplate {
    const formattedDate = expirationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      subject: `Lease Expiring in ${daysRemaining} Days`,
      body: `Dear ${tenantName},

Your lease at ${propertyName}, Unit ${unitNumber} will expire on ${formattedDate} (${daysRemaining} days remaining).

Please contact us to discuss renewal options or move-out procedures.

Best regards,
Property Management Team`,
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .notice { background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 15px; margin: 15px 0; }
    .countdown { font-size: 32px; font-weight: bold; color: #8b5cf6; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lease Expiring Soon</h1>
    </div>
    <div class="content">
      <p>Dear ${tenantName},</p>
      <div class="notice">
        <p class="countdown">${daysRemaining} Days Remaining</p>
        <p style="text-align: center;">Your lease expires on <strong>${formattedDate}</strong></p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
      </div>
      <p>Please contact us to discuss renewal options or move-out procedures.</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  </div>
</body>
</html>`,
    };
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
   * Process pending notifications
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

    for (const notification of pendingNotifications) {
      await this.sendNotification(notification.id);
    }

    return { processed: pendingNotifications.length };
  }
}
