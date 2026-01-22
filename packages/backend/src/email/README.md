# Email Service Configuration

The email service is fully implemented and production-ready. It supports multiple email providers and includes all necessary transactional email templates.

## Supported Providers

1. **SMTP** (Recommended for production)
   - Amazon SES (recommended - $0.10 per 1,000 emails)
   - SendGrid
   - Any SMTP provider

2. **Gmail API** (Optional for development)

## Quick Start

### Option 1: Amazon SES (Recommended for Production)

1. **Set up Amazon SES**:
   ```bash
   # Go to AWS Console > SES > SMTP Settings > Create SMTP Credentials
   # Save the SMTP username and password
   ```

2. **Add to `.env`**:
   ```bash
   SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
   SMTP_PORT=587
   SMTP_USER="your-smtp-username"
   SMTP_PASSWORD="your-smtp-password"
   SMTP_SECURE=false
   EMAIL_FROM="noreply@yourdomain.com"
   EMAIL_FROM_NAME="PropertyMaster"
   ```

3. **Verify your domain in SES**:
   - Add DNS records (SPF, DKIM, DMARC) for deliverability

### Option 2: SendGrid

1. **Get SendGrid API Key**:
   - Sign up at sendgrid.com
   - Create an API key

2. **Add to `.env`**:
   ```bash
   SMTP_HOST="smtp.sendgrid.net"
   SMTP_PORT=587
   SMTP_USER="apikey"
   SMTP_PASSWORD="your-sendgrid-api-key"
   SMTP_SECURE=false
   EMAIL_FROM="noreply@yourdomain.com"
   EMAIL_FROM_NAME="PropertyMaster"
   ```

### Option 3: Development (Console Logging)

If no SMTP credentials are configured, emails will be logged to console in development mode instead of being sent.

## Available Email Templates

The service includes the following transactional emails:

### Authentication
- `sendPasswordResetEmail()` - Password reset link
- `sendEmailVerificationEmail()` - Email verification
- `sendWelcomeEmail()` - Welcome after registration

### Payments
- `sendPaymentReceivedEmail()` - Payment confirmation
- `sendPaymentFailedEmail()` - Payment failure notification
- `sendRentDueReminderEmail()` - Rent due reminder
- `sendLateFeeAppliedEmail()` - Late fee notification
- `sendAutoPayUpcomingEmail()` - Auto-pay scheduled reminder
- `sendAutoPayProcessedEmail()` - Auto-pay confirmation

### Lease Management
- `sendLeaseExpiringEmail()` - Lease expiration notice
- `sendTenantInvitationEmail()` - Tenant portal invitation

### Work Orders
- `sendWorkOrderUpdateEmail()` - Work order status updates

### Vendor Management
- `sendVendorApprovalEmail()` - Vendor account approval

## Email Template Features

- ✅ HTML and plain text versions
- ✅ Responsive design
- ✅ Beautiful styling with branded colors
- ✅ Mobile-friendly
- ✅ Accessible

## Testing

Test the email service connection:

```typescript
// In your service
const isConnected = await this.emailService.verifyConnection();
console.log('Email service connected:', isConnected);

// Send a test email
const result = await this.emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'This is a test email',
  html: '<p>This is a test email</p>',
});
console.log('Email sent:', result);
```

## Production Checklist

Before going live:

- [ ] Set up Amazon SES or SendGrid account
- [ ] Add SMTP credentials to production `.env`
- [ ] Verify sending domain in SES
- [ ] Add SPF, DKIM, DMARC DNS records
- [ ] Test email deliverability with mail-tester.com
- [ ] Set up email monitoring/alerts
- [ ] Configure bounce and complaint handling

## Troubleshooting

### Emails not sending
1. Check environment variables are set correctly
2. Verify SMTP credentials are valid
3. Check email service logs in Winston
4. Test connection with `verifyConnection()`

### Emails going to spam
1. Verify domain in SES/SendGrid
2. Add SPF record: `v=spf1 include:amazonses.com ~all`
3. Add DKIM records from SES
4. Add DMARC record: `v=DMARC1; p=quarantine;`
5. Warm up sending domain gradually

### Rate limits
- Amazon SES: 14 emails/second (default)
- SendGrid: Varies by plan
- Implement queuing for bulk emails if needed
