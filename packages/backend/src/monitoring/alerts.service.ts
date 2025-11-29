import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { captureMessage, Sentry } from './sentry.config';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Service for managing system alerts and notifications
 * Integrates with Sentry and can be extended for Slack, PagerDuty, etc.
 */
@Injectable()
export class AlertsService {
  private recentAlerts: Alert[] = [];
  private alertCooldowns: Map<string, Date> = new Map();
  private readonly cooldownMinutes = 15; // Prevent alert spam

  constructor(
    private _configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Send an alert
   */
  async sendAlert(
    severity: AlertSeverity,
    title: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const alertKey = `${severity}:${title}`;

    // Check cooldown
    if (this.isOnCooldown(alertKey)) {
      this.logger.log({
        message: 'alerts.suppressed',
        title,
        reason: 'cooldown',
      });
      return;
    }

    const alert: Alert = {
      severity,
      title,
      message,
      context,
      timestamp: new Date(),
    };

    // Store alert
    this.recentAlerts.push(alert);
    if (this.recentAlerts.length > 100) {
      this.recentAlerts.shift();
    }

    // Set cooldown
    this.alertCooldowns.set(alertKey, new Date());

    // Log the alert
    const logLevel = this.getLogLevel(severity);
    this.logger.log({
      level: logLevel,
      message: 'alerts.triggered',
      alert: {
        severity,
        title,
        message,
        context,
      },
    });

    // Send to Sentry
    captureMessage(`[${severity.toUpperCase()}] ${title}: ${message}`, this.getSentrySeverity(severity), context);

    // Send to additional channels based on severity
    if (severity === AlertSeverity.CRITICAL) {
      await this.sendCriticalAlert(alert);
    } else if (severity === AlertSeverity.ERROR) {
      await this.sendErrorAlert(alert);
    }
  }

  /**
   * Alert for high error rate
   */
  async alertHighErrorRate(errorRate: number, threshold: number): Promise<void> {
    await this.sendAlert(
      AlertSeverity.WARNING,
      'High Error Rate Detected',
      `Error rate is ${errorRate.toFixed(2)}% (threshold: ${threshold}%)`,
      { errorRate, threshold },
    );
  }

  /**
   * Alert for slow response times
   */
  async alertSlowResponseTime(avgResponseTime: number, threshold: number): Promise<void> {
    await this.sendAlert(
      AlertSeverity.WARNING,
      'Slow Response Times Detected',
      `Average response time is ${avgResponseTime}ms (threshold: ${threshold}ms)`,
      { avgResponseTime, threshold },
    );
  }

  /**
   * Alert for database connectivity issues
   */
  async alertDatabaseIssue(error: string): Promise<void> {
    await this.sendAlert(
      AlertSeverity.CRITICAL,
      'Database Connectivity Issue',
      `Database connection error: ${error}`,
      { error },
    );
  }

  /**
   * Alert for payment processing failure
   */
  async alertPaymentFailure(
    paymentId: string,
    amount: number,
    error: string,
  ): Promise<void> {
    await this.sendAlert(
      AlertSeverity.ERROR,
      'Payment Processing Failed',
      `Payment ${paymentId} for $${amount} failed: ${error}`,
      { paymentId, amount, error },
    );
  }

  /**
   * Alert for high memory usage
   */
  async alertHighMemoryUsage(usagePercent: number, threshold: number): Promise<void> {
    await this.sendAlert(
      AlertSeverity.WARNING,
      'High Memory Usage',
      `Memory usage is ${usagePercent.toFixed(1)}% (threshold: ${threshold}%)`,
      { usagePercent, threshold },
    );
  }

  /**
   * Alert for security events
   */
  async alertSecurityEvent(
    eventType: string,
    details: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.sendAlert(
      AlertSeverity.CRITICAL,
      `Security Alert: ${eventType}`,
      details,
      context,
    );
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 10): Alert[] {
    return this.recentAlerts.slice(-count);
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    last24Hours: number;
  } {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.ERROR]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    let last24Hours = 0;

    this.recentAlerts.forEach((alert) => {
      bySeverity[alert.severity]++;
      if (alert.timestamp >= oneDayAgo) {
        last24Hours++;
      }
    });

    return {
      total: this.recentAlerts.length,
      bySeverity,
      last24Hours,
    };
  }

  /**
   * Check if alert is on cooldown
   */
  private isOnCooldown(alertKey: string): boolean {
    const lastSent = this.alertCooldowns.get(alertKey);
    if (!lastSent) return false;

    const cooldownEnd = new Date(lastSent.getTime() + this.cooldownMinutes * 60 * 1000);
    return new Date() < cooldownEnd;
  }

  /**
   * Get log level for severity
   */
  private getLogLevel(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
      case AlertSeverity.ERROR:
        return 'error';
      case AlertSeverity.WARNING:
        return 'warn';
      default:
        return 'info';
    }
  }

  /**
   * Get Sentry severity
   */
  private getSentrySeverity(severity: AlertSeverity): Sentry.SeverityLevel {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'fatal';
      case AlertSeverity.ERROR:
        return 'error';
      case AlertSeverity.WARNING:
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Send critical alert to additional channels
   */
  private async sendCriticalAlert(alert: Alert): Promise<void> {
    // TODO: Implement Slack/PagerDuty/SMS notification for critical alerts
    this.logger.error({
      message: 'alerts.critical',
      alert,
    });
  }

  /**
   * Send error alert to additional channels
   */
  private async sendErrorAlert(alert: Alert): Promise<void> {
    // TODO: Implement Slack notification for error alerts
    this.logger.error({
      message: 'alerts.error',
      alert,
    });
  }
}
