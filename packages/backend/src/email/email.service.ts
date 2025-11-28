import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;
  private readonly isEnabled: boolean;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.fromAddress = this.configService.get<string>('SMTP_FROM') || 'noreply@propertymaster.io';

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');

    // Enable email if SMTP_HOST is configured and not localhost (unless in dev mode)
    this.isEnabled = !!smtpHost;

    if (this.isEnabled) {
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

      const transportConfig: nodemailer.TransportOptions = {
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpPort === 465, // true for 465, false for other ports
      } as nodemailer.TransportOptions;

      // Only add auth if credentials are provided
      if (smtpUser && smtpPassword) {
        (transportConfig as Record<string, unknown>).auth = {
          user: smtpUser,
          pass: smtpPassword,
        };
      }

      this.transporter = nodemailer.createTransport(transportConfig);

      this.logger.log({
        message: 'email.service_initialized',
        host: smtpHost,
        port: smtpPort,
      });
    } else {
      this.logger.warn({
        message: 'email.service_disabled',
        reason: 'SMTP_HOST not configured',
      });
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      this.logger.warn({
        message: 'email.send_skipped',
        reason: 'Email service not enabled',
        to: options.to,
        subject: options.subject,
      });
      // In development/test mode, just log the email content
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log({
          message: 'email.development_log',
          to: options.to,
          subject: options.subject,
          textPreview: options.text.substring(0, 200),
        });
      }
      return true; // Return true in dev mode so the flow continues
    }

    try {
      const result = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log({
        message: 'email.sent',
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      this.logger.error({
        message: 'email.send_failed',
        to: options.to,
        subject: options.subject,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
    portalUrl: string,
  ): Promise<boolean> {
    const resetLink = `${portalUrl}/reset-password?token=${resetToken}`;

    const text = `Dear ${name},

You have requested to reset your password for the Tenant Portal.

Please click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email or contact support.

Best regards,
Property Management Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { background: #fef3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Dear ${name},</p>
      <p>You have requested to reset your password for the Tenant Portal.</p>
      <p><a href="${resetLink}" class="button">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #666;">${resetLink}</p>
      <div class="warning">
        <strong>Important:</strong> This link will expire in 1 hour.
      </div>
      <p>If you did not request this password reset, please ignore this email or contact support.</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to,
      subject: 'Password Reset Request',
      text,
      html,
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
  ): Promise<boolean> {
    const verificationLink = `${baseUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    const text = `Dear ${name},

Thank you for registering with PropertyMaster!

Please click the link below to verify your email address:
${verificationLink}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
PropertyMaster Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .info { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <p>Dear ${name},</p>
      <p>Thank you for registering with PropertyMaster!</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p><a href="${verificationLink}" class="button">Verify Email</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #666;">${verificationLink}</p>
      <div class="info">
        This link will expire in 24 hours.
      </div>
      <p>If you did not create an account, please ignore this email.</p>
      <p>Best regards,<br>PropertyMaster Team</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to,
      subject: 'Verify Your Email Address',
      text,
      html,
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(to: string, name: string, loginUrl: string): Promise<boolean> {
    const text = `Dear ${name},

Welcome to PropertyMaster! Your email has been verified and your account is now active.

You can now log in to your account at:
${loginUrl}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
PropertyMaster Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to PropertyMaster!</h1>
    </div>
    <div class="content">
      <p>Dear ${name},</p>
      <p>Your email has been verified and your account is now active!</p>
      <p><a href="${loginUrl}" class="button">Log In to Your Account</a></p>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
      <p>Best regards,<br>PropertyMaster Team</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to,
      subject: 'Welcome to PropertyMaster!',
      text,
      html,
    });
  }

  /**
   * Verify the SMTP connection is working
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log({ message: 'email.connection_verified' });
      return true;
    } catch (error) {
      this.logger.error({
        message: 'email.connection_failed',
        error: (error as Error).message,
      });
      return false;
    }
  }
}
