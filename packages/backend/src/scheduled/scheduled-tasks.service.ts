import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { LeasesService } from '../leases/leases.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HelcimService } from '../payments/helcim.service';
import { ChargesService } from '../financial/charges.service';
import { SettlementsService } from '../settlements/settlements.service';

@Injectable()
export class ScheduledTasksService {
  constructor(
    private prisma: PrismaService,
    private leasesService: LeasesService,
    private notificationsService: NotificationsService,
    private helcimService: HelcimService,
    private chargesService: ChargesService,
    private settlementsService: SettlementsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // ============================================================
  // LEASE EXPIRATION TASKS (Phase 50)
  // ============================================================

  /**
   * Process expired leases daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLeaseExpiration() {
    this.logger.log({ message: 'scheduled.lease_expiration.start' });

    try {
      const result = await this.leasesService.processExpiredLeases();
      this.logger.log({
        message: 'scheduled.lease_expiration.complete',
        processed: result.processed,
      });
    } catch (error) {
      this.logger.error({
        message: 'scheduled.lease_expiration.error',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send lease expiration reminders daily at 9 AM
   * - 90 days before: first reminder
   * - 60 days before: second reminder
   * - 30 days before: urgent reminder
   * - 7 days before: final reminder
   */
  @Cron('0 9 * * *') // 9:00 AM daily
  async handleLeaseExpirationReminders() {
    this.logger.log({ message: 'scheduled.lease_expiration_reminders.start' });

    const reminderDays = [90, 60, 30, 7];

    for (const days of reminderDays) {
      try {
        const expiringLeases = await this.getExpiringLeasesForReminder(days);

        for (const lease of expiringLeases) {
          const primaryTenant = lease.tenants.find((t: any) => t.isPrimary);
          if (!primaryTenant) {
            continue;
          }

          const organizationId = lease.unit.property.organizationId;

          await this.notificationsService.sendLeaseExpiringNotification(
            primaryTenant.email,
            `${primaryTenant.firstName} ${primaryTenant.lastName}`,
            lease.endDate!,
            days,
            lease.unit.property.name,
            lease.unit.unitNumber,
            lease.id,
            organizationId,
          );
        }

        this.logger.log({
          message: 'scheduled.lease_expiration_reminders.sent',
          days,
          count: expiringLeases.length,
        });
      } catch (error) {
        this.logger.error({
          message: 'scheduled.lease_expiration_reminders.error',
          days,
          error: (error as Error).message,
        });
      }
    }
  }

  private async getExpiringLeasesForReminder(daysAhead: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: targetDate,
          lt: nextDay,
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
    });
  }

  // ============================================================
  // AUTO-PAY PROCESSING (Phase 70)
  // ============================================================

  /**
   * Process auto-pay every day at 6 AM
   */
  @Cron('0 6 * * *') // 6:00 AM daily
  async handleAutoPayProcessing() {
    this.logger.log({ message: 'scheduled.autopay.start' });

    try {
      const leasesToProcess = await this.leasesService.getAutoPayLeasesForToday();
      const results = [];

      for (const lease of leasesToProcess) {
        try {
          const result = await this.processAutoPayForLease(lease);
          results.push(result);
        } catch (error) {
          results.push({
            leaseId: lease.id,
            status: 'error',
            error: (error as Error).message,
          });
          this.logger.error({
            message: 'scheduled.autopay.lease_error',
            leaseId: lease.id,
            error: (error as Error).message,
          });
        }
      }

      this.logger.log({
        message: 'scheduled.autopay.complete',
        processed: results.length,
        successful: results.filter((r) => r.status === 'success').length,
        failed: results.filter((r) => r.status === 'error').length,
      });
    } catch (error) {
      this.logger.error({
        message: 'scheduled.autopay.error',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send auto-pay upcoming reminders 3 days before
   */
  @Cron('0 10 * * *') // 10:00 AM daily
  async handleAutoPayReminders() {
    this.logger.log({ message: 'scheduled.autopay_reminders.start' });

    try {
      const today = new Date();
      const in3Days = today.getDate() + 3;

      // Handle end of month
      const daysToCheck = [in3Days];
      if (in3Days > 28) {
        // Also check for leases set to day 28
        daysToCheck.push(28);
      }

      const upcomingAutoPayLeases = await this.prisma.lease.findMany({
        where: {
          status: 'ACTIVE',
          autoPayEnabled: true,
          autoPayDay: { in: daysToCheck },
        },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenants: {
            where: { isPrimary: true },
          },
          charges: {
            where: {
              status: { in: ['POSTED', 'PARTIALLY_PAID'] },
            },
          },
        },
      });

      for (const lease of upcomingAutoPayLeases) {
        const primaryTenant = lease.tenants[0];
        if (!primaryTenant) {
          continue;
        }

        const outstandingAmount = lease.charges.reduce((sum, charge) => {
          return sum + (Number(charge.amount) - Number(charge.amountPaid));
        }, 0);

        if (outstandingAmount <= 0) {
          continue;
        }

        const chargeDate = new Date();
        chargeDate.setDate(lease.autoPayDay!);
        if (chargeDate < today) {
          chargeDate.setMonth(chargeDate.getMonth() + 1);
        }

        const organizationId = lease.unit.property.organizationId;

        await this.notificationsService.sendAutoPayUpcomingNotification(
          primaryTenant.email,
          `${primaryTenant.firstName} ${primaryTenant.lastName}`,
          outstandingAmount,
          chargeDate,
          lease.unit.property.name,
          lease.unit.unitNumber,
          lease.id,
          organizationId,
        );
      }

      this.logger.log({
        message: 'scheduled.autopay_reminders.complete',
        count: upcomingAutoPayLeases.length,
      });
    } catch (error) {
      this.logger.error({
        message: 'scheduled.autopay_reminders.error',
        error: (error as Error).message,
      });
    }
  }

  private async processAutoPayForLease(lease: any): Promise<any> {
    const primaryTenant = lease.tenants[0];
    if (!primaryTenant) {
      return { leaseId: lease.id, status: 'skipped', reason: 'no_primary_tenant' };
    }

    // Calculate outstanding balance
    const outstandingCharges = lease.charges.filter(
      (c: any) => c.status === 'POSTED' || c.status === 'PARTIALLY_PAID',
    );

    if (outstandingCharges.length === 0) {
      return { leaseId: lease.id, status: 'skipped', reason: 'no_outstanding_charges' };
    }

    const totalOutstanding = outstandingCharges.reduce((sum: number, charge: any) => {
      return sum + (Number(charge.amount) - Number(charge.amountPaid));
    }, 0);

    if (totalOutstanding <= 0) {
      return { leaseId: lease.id, status: 'skipped', reason: 'zero_balance' };
    }

    const organizationId = lease.unit.property.organizationId;

    try {
      // Process auto-pay with saved card token via Helcim
      const chargeIds = outstandingCharges.map((c: any) => c.id);

      // TODO: Implement saved card token storage and retrieval for auto-pay
      // For now, auto-pay requires tenant to have a saved card token in their profile
      // This will be fully implemented in Phase 70 (Auto-Pay with Dwolla for ACH)

      if (!lease.autoPayPaymentMethodId) {
        return {
          leaseId: lease.id,
          status: 'skipped',
          reason: 'no_saved_payment_method',
        };
      }

      // Process payment using saved card token
      const paymentResult = await this.helcimService.processPayment(
        lease.autoPayPaymentMethodId, // This would be a saved Helcim card token
        totalOutstanding,
        primaryTenant.id,
        chargeIds,
        {
          autoPayLeaseId: lease.id,
          isAutoPay: 'true',
        },
      );

      this.logger.log({
        message: 'scheduled.autopay.payment_processed',
        leaseId: lease.id,
        transactionId: paymentResult.transactionId,
        amount: totalOutstanding,
      });

      // Send notification
      await this.notificationsService.sendAutoPayProcessedNotification(
        primaryTenant.email,
        `${primaryTenant.firstName} ${primaryTenant.lastName}`,
        totalOutstanding,
        lease.unit.property.name,
        lease.unit.unitNumber,
        String(paymentResult.transactionId),
        organizationId,
      );

      return {
        leaseId: lease.id,
        status: 'success',
        transactionId: paymentResult.transactionId,
        amount: totalOutstanding,
      };
    } catch (error) {
      // Send failure notification
      await this.notificationsService.sendPaymentFailedNotification(
        primaryTenant.email,
        `${primaryTenant.firstName} ${primaryTenant.lastName}`,
        totalOutstanding,
        lease.unit.property.name,
        lease.unit.unitNumber,
        (error as Error).message,
        '',
        organizationId,
      );

      throw error;
    }
  }

  // ============================================================
  // RENT DUE REMINDERS (Phase 72)
  // ============================================================

  /**
   * Send rent due reminders 5 days before due date
   */
  @Cron('0 9 * * *') // 9:00 AM daily
  async handleRentDueReminders() {
    this.logger.log({ message: 'scheduled.rent_reminders.start' });

    try {
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      fiveDaysFromNow.setHours(0, 0, 0, 0);

      const sixDaysFromNow = new Date(fiveDaysFromNow);
      sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 1);

      // Find charges due in 5 days that are unpaid
      const upcomingCharges = await this.prisma.charge.findMany({
        where: {
          status: { in: ['POSTED', 'PARTIALLY_PAID'] },
          type: 'RENT',
          dueDate: {
            gte: fiveDaysFromNow,
            lt: sixDaysFromNow,
          },
        },
        include: {
          lease: {
            include: {
              unit: {
                include: {
                  property: true,
                },
              },
              tenants: {
                where: { isPrimary: true },
              },
            },
          },
        },
      });

      for (const charge of upcomingCharges) {
        // Skip if auto-pay is enabled
        if (charge.lease.autoPayEnabled) {
          continue;
        }

        const primaryTenant = charge.lease.tenants[0];
        if (!primaryTenant) {
          continue;
        }

        const outstandingAmount = Number(charge.amount) - Number(charge.amountPaid);
        if (outstandingAmount <= 0) {
          continue;
        }

        const organizationId = charge.lease.unit.property.organizationId;

        await this.notificationsService.sendRentDueReminderNotification(
          primaryTenant.email,
          `${primaryTenant.firstName} ${primaryTenant.lastName}`,
          outstandingAmount,
          charge.dueDate,
          charge.lease.unit.property.name,
          charge.lease.unit.unitNumber,
          charge.id,
          organizationId,
        );
      }

      this.logger.log({
        message: 'scheduled.rent_reminders.complete',
        count: upcomingCharges.length,
      });
    } catch (error) {
      this.logger.error({
        message: 'scheduled.rent_reminders.error',
        error: (error as Error).message,
      });
    }
  }

  // ============================================================
  // NOTIFICATION PROCESSING
  // ============================================================

  /**
   * Process pending notifications every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleNotificationProcessing() {
    try {
      const result = await this.notificationsService.processPendingNotifications();
      if (result.processed > 0) {
        this.logger.log({
          message: 'scheduled.notifications.processed',
          count: result.processed,
        });
      }
    } catch (error) {
      this.logger.error({
        message: 'scheduled.notifications.error',
        error: (error as Error).message,
      });
    }
  }

  // ============================================================
  // LATE FEE GENERATION
  // ============================================================

  /**
   * Generate late fees daily at 7 AM for all organizations
   * Applies late fees to rent charges past the grace period
   */
  @Cron('0 7 * * *') // 7:00 AM daily
  async handleLateFeeGeneration() {
    this.logger.log({ message: 'scheduled.late_fees.start' });

    try {
      // Get all organizations
      const organizations = await this.prisma.organization.findMany({
        select: { id: true },
      });

      let totalGenerated = 0;
      let totalSkipped = 0;

      for (const org of organizations) {
        try {
          const result = await this.chargesService.generateLateFees(
            {
              gracePeriodDays: 5,
              feeType: 'FLAT',
              feeAmount: 50,
            },
            org.id,
          );

          totalGenerated += result.generated;
          totalSkipped += result.skipped;
        } catch (error) {
          this.logger.error({
            message: 'scheduled.late_fees.org_error',
            organizationId: org.id,
            error: (error as Error).message,
          });
        }
      }

      this.logger.log({
        message: 'scheduled.late_fees.complete',
        generated: totalGenerated,
        skipped: totalSkipped,
        organizations: organizations.length,
      });
    } catch (error) {
      this.logger.error({
        message: 'scheduled.late_fees.error',
        error: (error as Error).message,
      });
    }
  }

  // ============================================================
  // LANDLORD PAYOUTS (Settlement)
  // ============================================================

  /**
   * Process auto-payouts daily at 8 AM
   * Checks each organization's payout schedule and initiates transfers
   */
  @Cron('0 8 * * 1-5') // 8:00 AM Monday-Friday
  async handleAutoPayouts() {
    this.logger.log({ message: 'scheduled.payouts.start' });

    try {
      const result = await this.settlementsService.processAutoPayouts();

      this.logger.log({
        message: 'scheduled.payouts.complete',
        processed: result.processed,
        failed: result.failed,
        skipped: result.skipped,
      });
    } catch (error) {
      this.logger.error({
        message: 'scheduled.payouts.error',
        error: (error as Error).message,
      });
    }
  }
}
