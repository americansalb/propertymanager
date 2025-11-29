import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type EmailProvider = 'sendgrid' | 'smtp' | 'none';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private sendgridClient: typeof import('@sendgrid/mail') | null = null;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly provider: EmailProvider;
  private readonly isProduction: boolean;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.fromAddress = this.configService.get<string>('EMAIL_FROM') ||
                       this.configService.get<string>('SMTP_FROM') ||
                       'noreply@propertymaster.io';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'PropertyMaster';
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // Determine email provider
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const smtpHost = this.configService.get<string>('SMTP_HOST');

    if (sendgridApiKey) {
      this.provider = 'sendgrid';
      this.initializeSendGrid(sendgridApiKey);
    } else if (smtpHost) {
      this.provider = 'smtp';
      this.initializeSmtp();
    } else {
      this.provider = 'none';
      this.logger.warn({
        message: 'email.no_provider_configured',
        hint: 'Set SENDGRID_API_KEY or SMTP_HOST to enable email sending',
      });
    }
  }

  private async initializeSendGrid(apiKey: string): Promise<void> {
    try {
      // Dynamic import to avoid issues if package is not installed
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(apiKey);
      this.sendgridClient = sgMail.default;

      this.logger.log({
        message: 'email.sendgrid_initialized',
        from: this.fromAddress,
      });
    } catch (error) {
      this.logger.error({
        message: 'email.sendgrid_init_failed',
        error: (error as Error).message,
      });
      this.sendgridClient = null;
    }
  }

  private initializeSmtp(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE') || smtpPort === 465;

    const transportConfig: nodemailer.TransportOptions = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
    } as nodemailer.TransportOptions;

    if (smtpUser && smtpPassword) {
      (transportConfig as Record<string, unknown>).auth = {
        user: smtpUser,
        pass: smtpPassword,
      };
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    this.logger.log({
      message: 'email.smtp_initialized',
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
    });
  }

  /**
   * Get the current email provider
   */
  getProvider(): EmailProvider {
    return this.provider;
  }

  /**
   * Check if email sending is enabled
   */
  isEnabled(): boolean {
    return this.provider !== 'none';
  }

  /**
   * Send an email using the configured provider
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const startTime = Date.now();

    // Log the attempt
    this.logger.log({
      message: 'email.send_attempt',
      provider: this.provider,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
    });

    // Handle disabled provider
    if (this.provider === 'none') {
      if (!this.isProduction) {
        // In development, log the email content for debugging
        this.logger.log({
          message: 'email.development_preview',
          to: options.to,
          subject: options.subject,
          textPreview: options.text.substring(0, 500),
        });
        return { success: true, messageId: 'dev-mode-no-send' };
      }
      return { success: false, error: 'Email provider not configured' };
    }

    try {
      let result: EmailResult;

      if (this.provider === 'sendgrid' && this.sendgridClient) {
        result = await this.sendViaSendGrid(options);
      } else if (this.provider === 'smtp' && this.transporter) {
        result = await this.sendViaSmtp(options);
      } else {
        result = { success: false, error: 'Email provider not properly initialized' };
      }

      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.log({
          message: 'email.sent',
          provider: this.provider,
          to: options.to,
          subject: options.subject,
          messageId: result.messageId,
          duration,
        });
      } else {
        this.logger.error({
          message: 'email.send_failed',
          provider: this.provider,
          to: options.to,
          subject: options.subject,
          error: result.error,
          duration,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error({
        message: 'email.send_exception',
        provider: this.provider,
        to: options.to,
        subject: options.subject,
        error: errorMessage,
        stack: (error as Error).stack,
      });
      return { success: false, error: errorMessage };
    }
  }

  private async sendViaSendGrid(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.sendgridClient) {
      return { success: false, error: 'SendGrid client not initialized' };
    }

    const msg = {
      to: options.to,
      from: {
        email: this.fromAddress,
        name: this.fromName,
      },
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        type: att.contentType,
        disposition: 'attachment' as const,
      })),
    };

    const [response] = await this.sendgridClient.send(msg);

    return {
      success: response.statusCode >= 200 && response.statusCode < 300,
      messageId: response.headers['x-message-id'] as string,
    };
  }

  private async sendViaSmtp(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.transporter) {
      return { success: false, error: 'SMTP transporter not initialized' };
    }

    const result = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  }

  /**
   * Verify the email service connection
   */
  async verifyConnection(): Promise<boolean> {
    if (this.provider === 'none') {
      return false;
    }

    if (this.provider === 'smtp' && this.transporter) {
      try {
        await this.transporter.verify();
        this.logger.log({ message: 'email.smtp_connection_verified' });
        return true;
      } catch (error) {
        this.logger.error({
          message: 'email.smtp_connection_failed',
          error: (error as Error).message,
        });
        return false;
      }
    }

    // SendGrid doesn't have a verify method, assume it's working if configured
    if (this.provider === 'sendgrid' && this.sendgridClient) {
      return true;
    }

    return false;
  }

  // ============================================================
  // TRANSACTIONAL EMAIL TEMPLATES
  // ============================================================

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
    portalUrl: string,
  ): Promise<EmailResult> {
    const resetLink = `${portalUrl}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: 'Password Reset Request - PropertyMaster',
      text: this.getPasswordResetText(name, resetLink),
      html: this.getPasswordResetHtml(name, resetLink),
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(
    to: string,
    name: string,
    verificationToken: string,
    baseUrl: string,
  ): Promise<EmailResult> {
    const verificationLink = `${baseUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    return this.sendEmail({
      to,
      subject: 'Verify Your Email Address - PropertyMaster',
      text: this.getEmailVerificationText(name, verificationLink),
      html: this.getEmailVerificationHtml(name, verificationLink),
    });
  }

  /**
   * Send welcome email after registration/verification
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    loginUrl: string,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: 'Welcome to PropertyMaster!',
      text: this.getWelcomeText(name, loginUrl),
      html: this.getWelcomeHtml(name, loginUrl),
    });
  }

  /**
   * Send payment received confirmation
   */
  async sendPaymentReceivedEmail(
    to: string,
    tenantName: string,
    amount: number,
    paymentDate: Date,
    propertyName: string,
    unitNumber: string,
    confirmationNumber: string,
  ): Promise<EmailResult> {
    const formattedAmount = this.formatCurrency(amount);
    const formattedDate = this.formatDate(paymentDate);

    return this.sendEmail({
      to,
      subject: `Payment Received - ${formattedAmount}`,
      text: this.getPaymentReceivedText(tenantName, formattedAmount, formattedDate, propertyName, unitNumber, confirmationNumber),
      html: this.getPaymentReceivedHtml(tenantName, formattedAmount, formattedDate, propertyName, unitNumber, confirmationNumber),
    });
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedEmail(
    to: string,
    tenantName: string,
    amount: number,
    propertyName: string,
    unitNumber: string,
    reason: string,
    portalUrl: string,
  ): Promise<EmailResult> {
    const formattedAmount = this.formatCurrency(amount);

    return this.sendEmail({
      to,
      subject: 'Payment Failed - Action Required',
      text: this.getPaymentFailedText(tenantName, formattedAmount, propertyName, unitNumber, reason, portalUrl),
      html: this.getPaymentFailedHtml(tenantName, formattedAmount, propertyName, unitNumber, reason, portalUrl),
    });
  }

  /**
   * Send rent due reminder
   */
  async sendRentDueReminderEmail(
    to: string,
    tenantName: string,
    amount: number,
    dueDate: Date,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): Promise<EmailResult> {
    const formattedAmount = this.formatCurrency(amount);
    const formattedDate = this.formatDate(dueDate);

    return this.sendEmail({
      to,
      subject: `Rent Due Reminder - ${formattedDate}`,
      text: this.getRentDueReminderText(tenantName, formattedAmount, formattedDate, propertyName, unitNumber, portalUrl),
      html: this.getRentDueReminderHtml(tenantName, formattedAmount, formattedDate, propertyName, unitNumber, portalUrl),
    });
  }

  /**
   * Send late fee applied notification
   */
  async sendLateFeeAppliedEmail(
    to: string,
    tenantName: string,
    lateFeeAmount: number,
    totalDue: number,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): Promise<EmailResult> {
    const formattedLateFee = this.formatCurrency(lateFeeAmount);
    const formattedTotal = this.formatCurrency(totalDue);

    return this.sendEmail({
      to,
      subject: 'Late Fee Applied to Your Account',
      text: this.getLateFeeAppliedText(tenantName, formattedLateFee, formattedTotal, propertyName, unitNumber, portalUrl),
      html: this.getLateFeeAppliedHtml(tenantName, formattedLateFee, formattedTotal, propertyName, unitNumber, portalUrl),
    });
  }

  /**
   * Send auto-pay upcoming notification
   */
  async sendAutoPayUpcomingEmail(
    to: string,
    tenantName: string,
    amount: number,
    chargeDate: Date,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): Promise<EmailResult> {
    const formattedAmount = this.formatCurrency(amount);
    const formattedDate = this.formatDate(chargeDate);

    return this.sendEmail({
      to,
      subject: `Auto-Pay Scheduled - ${formattedDate}`,
      text: this.getAutoPayUpcomingText(tenantName, formattedAmount, formattedDate, propertyName, unitNumber, portalUrl),
      html: this.getAutoPayUpcomingHtml(tenantName, formattedAmount, formattedDate, propertyName, unitNumber, portalUrl),
    });
  }

  /**
   * Send auto-pay processed notification
   */
  async sendAutoPayProcessedEmail(
    to: string,
    tenantName: string,
    amount: number,
    propertyName: string,
    unitNumber: string,
    confirmationNumber: string,
  ): Promise<EmailResult> {
    const formattedAmount = this.formatCurrency(amount);

    return this.sendEmail({
      to,
      subject: `Auto-Pay Processed - ${formattedAmount}`,
      text: this.getAutoPayProcessedText(tenantName, formattedAmount, propertyName, unitNumber, confirmationNumber),
      html: this.getAutoPayProcessedHtml(tenantName, formattedAmount, propertyName, unitNumber, confirmationNumber),
    });
  }

  /**
   * Send lease expiring notification
   */
  async sendLeaseExpiringEmail(
    to: string,
    tenantName: string,
    expirationDate: Date,
    daysRemaining: number,
    propertyName: string,
    unitNumber: string,
    contactEmail: string,
  ): Promise<EmailResult> {
    const formattedDate = this.formatDate(expirationDate);

    return this.sendEmail({
      to,
      subject: `Lease Expiring in ${daysRemaining} Days`,
      text: this.getLeaseExpiringText(tenantName, formattedDate, daysRemaining, propertyName, unitNumber, contactEmail),
      html: this.getLeaseExpiringHtml(tenantName, formattedDate, daysRemaining, propertyName, unitNumber, contactEmail),
    });
  }

  /**
   * Send work order status update
   */
  async sendWorkOrderUpdateEmail(
    to: string,
    tenantName: string,
    workOrderTitle: string,
    newStatus: string,
    notes: string | null,
    propertyName: string,
    unitNumber: string,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `Work Order Update: ${workOrderTitle}`,
      text: this.getWorkOrderUpdateText(tenantName, workOrderTitle, newStatus, notes, propertyName, unitNumber),
      html: this.getWorkOrderUpdateHtml(tenantName, workOrderTitle, newStatus, notes, propertyName, unitNumber),
    });
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

  // ============================================================
  // EMAIL TEMPLATE - BASE STYLES
  // ============================================================

  private getBaseEmailStyles(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1f2937;
        margin: 0;
        padding: 0;
        background-color: #f3f4f6;
      }
      .wrapper {
        width: 100%;
        background-color: #f3f4f6;
        padding: 40px 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .header {
        padding: 32px 24px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      .content {
        padding: 32px 24px;
      }
      .details {
        background: #f9fafb;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        border: 1px solid #e5e7eb;
      }
      .details p {
        margin: 8px 0;
      }
      .button {
        display: inline-block;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 8px;
        margin: 20px 0;
        font-weight: 600;
        font-size: 16px;
      }
      .button-primary {
        background: #3b82f6;
        color: white !important;
      }
      .button-success {
        background: #10b981;
        color: white !important;
      }
      .alert {
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
        border-left: 4px solid;
      }
      .alert-warning {
        background: #fffbeb;
        border-color: #f59e0b;
      }
      .alert-error {
        background: #fef2f2;
        border-color: #ef4444;
      }
      .alert-success {
        background: #ecfdf5;
        border-color: #10b981;
      }
      .alert-info {
        background: #eff6ff;
        border-color: #3b82f6;
      }
      .footer {
        padding: 24px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
      }
      .amount {
        font-size: 28px;
        font-weight: 700;
      }
      .countdown {
        font-size: 36px;
        font-weight: 700;
        text-align: center;
        margin: 16px 0;
      }
    `;
  }

  private wrapHtml(headerColor: string, headerText: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${this.getBaseEmailStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header" style="background: ${headerColor}; color: white;">
        <h1>${headerText}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} PropertyMaster. All rights reserved.</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // ============================================================
  // TEXT TEMPLATES
  // ============================================================

  private getPasswordResetText(name: string, resetLink: string): string {
    return `Dear ${name},

You have requested to reset your password for the Tenant Portal.

Please click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email or contact support.

Best regards,
PropertyMaster Team`;
  }

  private getEmailVerificationText(name: string, verificationLink: string): string {
    return `Dear ${name},

Thank you for registering with PropertyMaster!

Please click the link below to verify your email address:
${verificationLink}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
PropertyMaster Team`;
  }

  private getWelcomeText(name: string, loginUrl: string): string {
    return `Dear ${name},

Welcome to PropertyMaster! Your email has been verified and your account is now active.

You can now log in to your account at:
${loginUrl}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
PropertyMaster Team`;
  }

  private getPaymentReceivedText(
    tenantName: string,
    amount: string,
    date: string,
    propertyName: string,
    unitNumber: string,
    confirmationNumber: string,
  ): string {
    return `Dear ${tenantName},

We have received your payment. Thank you!

Payment Details:
- Property: ${propertyName}
- Unit: ${unitNumber}
- Amount: ${amount}
- Date: ${date}
- Confirmation #: ${confirmationNumber}

Thank you for your payment!

Best regards,
PropertyMaster Team`;
  }

  private getPaymentFailedText(
    tenantName: string,
    amount: string,
    propertyName: string,
    unitNumber: string,
    reason: string,
    portalUrl: string,
  ): string {
    return `Dear ${tenantName},

Unfortunately, your payment of ${amount} could not be processed.

Property: ${propertyName}
Unit: ${unitNumber}
Reason: ${reason}

Please update your payment method or try again at:
${portalUrl}

Best regards,
PropertyMaster Team`;
  }

  private getRentDueReminderText(
    tenantName: string,
    amount: string,
    dueDate: string,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): string {
    return `Dear ${tenantName},

This is a friendly reminder that your rent payment is due soon.

Property: ${propertyName}
Unit: ${unitNumber}
Amount Due: ${amount}
Due Date: ${dueDate}

Please make your payment to avoid late fees at:
${portalUrl}

Best regards,
PropertyMaster Team`;
  }

  private getLateFeeAppliedText(
    tenantName: string,
    lateFeeAmount: string,
    totalDue: string,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): string {
    return `Dear ${tenantName},

A late fee has been applied to your account.

Property: ${propertyName}
Unit: ${unitNumber}
Late Fee: ${lateFeeAmount}
Total Due: ${totalDue}

Please make your payment as soon as possible at:
${portalUrl}

Best regards,
PropertyMaster Team`;
  }

  private getAutoPayUpcomingText(
    tenantName: string,
    amount: string,
    chargeDate: string,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): string {
    return `Dear ${tenantName},

This is a reminder that your auto-pay will be processed soon.

Property: ${propertyName}
Unit: ${unitNumber}
Amount: ${amount}
Scheduled Date: ${chargeDate}

If you need to make changes, please update your payment settings before the scheduled date at:
${portalUrl}

Best regards,
PropertyMaster Team`;
  }

  private getAutoPayProcessedText(
    tenantName: string,
    amount: string,
    propertyName: string,
    unitNumber: string,
    confirmationNumber: string,
  ): string {
    return `Dear ${tenantName},

Your auto-pay has been successfully processed.

Property: ${propertyName}
Unit: ${unitNumber}
Amount: ${amount}
Confirmation #: ${confirmationNumber}

Thank you for using auto-pay!

Best regards,
PropertyMaster Team`;
  }

  private getLeaseExpiringText(
    tenantName: string,
    expirationDate: string,
    daysRemaining: number,
    propertyName: string,
    unitNumber: string,
    contactEmail: string,
  ): string {
    return `Dear ${tenantName},

Your lease is expiring soon.

Property: ${propertyName}
Unit: ${unitNumber}
Expiration Date: ${expirationDate}
Days Remaining: ${daysRemaining}

Please contact us to discuss renewal options or move-out procedures at:
${contactEmail}

Best regards,
PropertyMaster Team`;
  }

  private getWorkOrderUpdateText(
    tenantName: string,
    workOrderTitle: string,
    newStatus: string,
    notes: string | null,
    propertyName: string,
    unitNumber: string,
  ): string {
    return `Dear ${tenantName},

Your work order has been updated.

Work Order: ${workOrderTitle}
Property: ${propertyName}
Unit: ${unitNumber}
New Status: ${newStatus}
${notes ? `\nNotes: ${notes}` : ''}

Best regards,
PropertyMaster Team`;
  }

  // ============================================================
  // HTML TEMPLATES
  // ============================================================

  private getPasswordResetHtml(name: string, resetLink: string): string {
    return this.wrapHtml('#3b82f6', 'Password Reset Request', `
      <p>Dear ${name},</p>
      <p>You have requested to reset your password for the Tenant Portal.</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button button-primary">Reset Password</a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">Or copy and paste this link: ${resetLink}</p>
      <div class="alert alert-warning">
        <strong>Important:</strong> This link will expire in 1 hour.
      </div>
      <p>If you did not request this password reset, please ignore this email.</p>
    `);
  }

  private getEmailVerificationHtml(name: string, verificationLink: string): string {
    return this.wrapHtml('#10b981', 'Verify Your Email', `
      <p>Dear ${name},</p>
      <p>Thank you for registering with PropertyMaster!</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verificationLink}" class="button button-success">Verify Email</a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">Or copy and paste this link: ${verificationLink}</p>
      <div class="alert alert-info">
        This link will expire in 24 hours.
      </div>
    `);
  }

  private getWelcomeHtml(name: string, loginUrl: string): string {
    return this.wrapHtml('#8b5cf6', 'Welcome to PropertyMaster!', `
      <p>Dear ${name},</p>
      <p>Your email has been verified and your account is now active!</p>
      <p style="text-align: center;">
        <a href="${loginUrl}" class="button button-primary">Log In to Your Account</a>
      </p>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
    `);
  }

  private getPaymentReceivedHtml(
    tenantName: string,
    amount: string,
    date: string,
    propertyName: string,
    unitNumber: string,
    confirmationNumber: string,
  ): string {
    return this.wrapHtml('#10b981', 'Payment Received', `
      <p>Dear ${tenantName},</p>
      <p>We have received your payment. Thank you!</p>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
        <p><strong>Amount:</strong> <span class="amount" style="color: #10b981;">${amount}</span></p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Confirmation #:</strong> ${confirmationNumber}</p>
      </div>
      <div class="alert alert-success">
        Your payment has been successfully processed.
      </div>
    `);
  }

  private getPaymentFailedHtml(
    tenantName: string,
    amount: string,
    propertyName: string,
    unitNumber: string,
    reason: string,
    portalUrl: string,
  ): string {
    return this.wrapHtml('#ef4444', 'Payment Failed', `
      <p>Dear ${tenantName},</p>
      <div class="alert alert-error">
        <p>Your payment of <strong>${amount}</strong> could not be processed.</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
      </div>
      <p style="text-align: center;">
        <a href="${portalUrl}" class="button button-primary">Update Payment Method</a>
      </p>
    `);
  }

  private getRentDueReminderHtml(
    tenantName: string,
    amount: string,
    dueDate: string,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): string {
    return this.wrapHtml('#f59e0b', 'Rent Due Reminder', `
      <p>Dear ${tenantName},</p>
      <div class="alert alert-warning">
        <p>Your rent payment of <strong>${amount}</strong> is due on <strong>${dueDate}</strong>.</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
        <p><strong>Amount Due:</strong> ${amount}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
      </div>
      <p style="text-align: center;">
        <a href="${portalUrl}" class="button button-primary">Pay Now</a>
      </p>
      <p>Please make your payment to avoid late fees.</p>
    `);
  }

  private getLateFeeAppliedHtml(
    tenantName: string,
    lateFeeAmount: string,
    totalDue: string,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): string {
    return this.wrapHtml('#ef4444', 'Late Fee Applied', `
      <p>Dear ${tenantName},</p>
      <div class="alert alert-error">
        <p>A late fee of <strong>${lateFeeAmount}</strong> has been applied to your account.</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
        <p><strong>Late Fee:</strong> ${lateFeeAmount}</p>
        <p><strong>Total Due:</strong> <span class="amount" style="color: #ef4444;">${totalDue}</span></p>
      </div>
      <p style="text-align: center;">
        <a href="${portalUrl}" class="button button-primary">Pay Now</a>
      </p>
    `);
  }

  private getAutoPayUpcomingHtml(
    tenantName: string,
    amount: string,
    chargeDate: string,
    propertyName: string,
    unitNumber: string,
    portalUrl: string,
  ): string {
    return this.wrapHtml('#3b82f6', 'Auto-Pay Reminder', `
      <p>Dear ${tenantName},</p>
      <div class="alert alert-info">
        <p>Your auto-pay of <strong>${amount}</strong> will be processed on <strong>${chargeDate}</strong>.</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Scheduled Date:</strong> ${chargeDate}</p>
      </div>
      <p>If you need to make changes, please update your payment settings before the scheduled date.</p>
      <p style="text-align: center;">
        <a href="${portalUrl}" class="button button-primary">Manage Auto-Pay</a>
      </p>
    `);
  }

  private getAutoPayProcessedHtml(
    tenantName: string,
    amount: string,
    propertyName: string,
    unitNumber: string,
    confirmationNumber: string,
  ): string {
    return this.wrapHtml('#10b981', 'Auto-Pay Processed', `
      <p>Dear ${tenantName},</p>
      <div class="alert alert-success">
        <p>Your auto-pay of <strong>${amount}</strong> has been successfully processed.</p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
        <p><strong>Amount:</strong> <span class="amount" style="color: #10b981;">${amount}</span></p>
        <p><strong>Confirmation #:</strong> ${confirmationNumber}</p>
      </div>
      <p>Thank you for using auto-pay!</p>
    `);
  }

  private getLeaseExpiringHtml(
    tenantName: string,
    expirationDate: string,
    daysRemaining: number,
    propertyName: string,
    unitNumber: string,
    contactEmail: string,
  ): string {
    return this.wrapHtml('#8b5cf6', 'Lease Expiring Soon', `
      <p>Dear ${tenantName},</p>
      <div class="alert alert-warning" style="text-align: center;">
        <p class="countdown" style="color: #8b5cf6;">${daysRemaining} Days Remaining</p>
        <p>Your lease expires on <strong>${expirationDate}</strong></p>
      </div>
      <div class="details">
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
      </div>
      <p>Please contact us to discuss renewal options or move-out procedures.</p>
      <p style="text-align: center;">
        <a href="mailto:${contactEmail}" class="button button-primary">Contact Us</a>
      </p>
    `);
  }

  private getWorkOrderUpdateHtml(
    tenantName: string,
    workOrderTitle: string,
    newStatus: string,
    notes: string | null,
    propertyName: string,
    unitNumber: string,
  ): string {
    const statusColor = this.getStatusColor(newStatus);

    return this.wrapHtml('#6366f1', 'Work Order Update', `
      <p>Dear ${tenantName},</p>
      <p>Your work order has been updated.</p>
      <div class="details">
        <p><strong>Work Order:</strong> ${workOrderTitle}</p>
        <p><strong>Property:</strong> ${propertyName}</p>
        <p><strong>Unit:</strong> ${unitNumber}</p>
        <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${newStatus}</span></p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      </div>
    `);
  }

  private getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      'SUBMITTED': '#f59e0b',
      'ASSIGNED': '#3b82f6',
      'IN_PROGRESS': '#6366f1',
      'ON_HOLD': '#9ca3af',
      'COMPLETED': '#10b981',
      'CANCELLED': '#ef4444',
    };
    return statusColors[status.toUpperCase()] || '#6b7280';
  }
}
