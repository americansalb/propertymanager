# Amazon SES Setup Verification & Completion Checklist

## Current Status

✅ **Completed:**
- Email service code supports Amazon SES via SMTP (`packages/backend/src/email/email.service.ts`)
- render.yaml configured with SES structure (lines 32-46)
- SMTP_HOST set to `email-smtp.us-east-1.amazonaws.com`
- SMTP_PORT set to `587`
- EMAIL_FROM_NAME set to `PropertyMaster`

⚠️ **Needs Completion:**
- SMTP_USER (AWS SES SMTP username)
- SMTP_PASSWORD (AWS SES SMTP password)
- EMAIL_FROM (verified sender email address)
- SMTP_FROM (may be same as EMAIL_FROM)
- AWS SES domain/email verification
- AWS SES production access request (if sending to unverified addresses)

---

## Step 1: Verify AWS SES Setup

### 1.1 Check if SES is Set Up in AWS Console

**Go to:** https://console.aws.amazon.com/ses/home?region=us-east-1

**Verify:**
- [ ] You have an AWS account with SES access in `us-east-1` region
- [ ] At least one email address or domain is verified
- [ ] SMTP credentials have been created

### 1.2 Check SES Account Status

**In SES Console → Account Dashboard:**
- [ ] Check if account is in **Sandbox Mode** or **Production Access**

**Sandbox Mode Limitations:**
- Can only send to verified email addresses
- 200 emails per 24-hour period
- 1 email per second

**If in Sandbox:** You'll need to request production access (see Step 4)

---

## Step 2: Verify or Create Sender Identity

### Option A: Verify a Single Email Address (Quickest)

**Use Case:** Testing, small deployments, sending from a single address

**Steps:**
1. Go to SES Console → Verified Identities
2. Click "Create identity"
3. Select "Email address"
4. Enter: `noreply@yourdomain.com` (or your preferred sender email)
5. Click "Create identity"
6. Check your inbox for verification email from AWS
7. Click verification link
8. Wait for status to show "Verified"

### Option B: Verify an Entire Domain (Recommended for Production)

**Use Case:** Production deployments, multiple sender addresses

**Steps:**
1. Go to SES Console → Verified Identities
2. Click "Create identity"
3. Select "Domain"
4. Enter your domain: `yourdomain.com`
5. Choose "Easy DKIM" (recommended)
6. Click "Create identity"
7. Copy the 3 CNAME records provided by AWS
8. Add these CNAME records to your domain's DNS settings
   - If using Route 53: AWS can add them automatically
   - If using another provider: Add manually
9. Wait 24-72 hours for DNS propagation
10. Return to SES Console and verify domain shows "Verified"

**DNS Records Example:**
```
_amazonses.yourdomain.com     CNAME    abcd1234.dkim.amazonses.com
12345._domainkey.yourdomain.com    CNAME    12345.dkim.amazonses.com
67890._domainkey.yourdomain.com    CNAME    67890.dkim.amazonses.com
```

---

## Step 3: Get or Create SMTP Credentials

### 3.1 Check if SMTP Credentials Already Exist

**Steps:**
1. Go to SES Console → SMTP Settings
2. Look for "SMTP credentials" section
3. If you see a username listed, credentials were already created

**If credentials exist but you don't have the password:**
- You **cannot** retrieve the password after creation
- You must create new SMTP credentials

### 3.2 Create New SMTP Credentials

**Steps:**
1. Go to SES Console → SMTP Settings
2. Click "Create SMTP credentials"
3. Enter IAM user name: `propertymaster-smtp-user`
4. Click "Create"
5. **CRITICAL:** Copy both the SMTP username and password immediately
   - SMTP Username: `AKIAXXXXXXXXXXXXXXXX` (starts with AKIA)
   - SMTP Password: `BPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (long password)
6. Save these in a secure location (1Password, LastPass, etc.)
7. You will NOT be able to see the password again

**Example credentials format:**
```
SMTP Username: AKIAIOSFODNN7EXAMPLE
SMTP Password: BPaY+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 4: Configure Render Environment Variables

### 4.1 Access Render Dashboard

**Steps:**
1. Go to https://dashboard.render.com
2. Select your `propertymanager-1` web service
3. Go to "Environment" tab

### 4.2 Add or Update SMTP Credentials

**Required Variables:**

| Variable | Value | Example |
|----------|-------|---------|
| SMTP_USER | Your AWS SES SMTP username from Step 3 | `AKIAIOSFODNN7EXAMPLE` |
| SMTP_PASSWORD | Your AWS SES SMTP password from Step 3 | `BPaY+xxxxxxxxxxx` |
| EMAIL_FROM | Your verified sender email from Step 2 | `noreply@yourdomain.com` |
| SMTP_FROM | Same as EMAIL_FROM | `noreply@yourdomain.com` |

**Already Configured (Do Not Change):**
- SMTP_HOST: `email-smtp.us-east-1.amazonaws.com`
- SMTP_PORT: `587`
- EMAIL_FROM_NAME: `PropertyMaster`

**Steps:**
1. In Render dashboard, click "Add Environment Variable"
2. Add each variable:
   - Key: `SMTP_USER`
   - Value: Your SMTP username
   - Click "Save"
3. Repeat for SMTP_PASSWORD, EMAIL_FROM, SMTP_FROM
4. After adding all variables, click "Manual Deploy" → "Deploy latest commit"
5. Wait for deployment to complete (~3-5 minutes)

---

## Step 5: Test Email Sending

### 5.1 Check Application Logs

**After deployment completes:**
1. Go to Render dashboard → Logs tab
2. Look for log message:
   ```
   [EmailService] Email provider initialized: smtp
   ```
3. If you see `Email provider initialized: none`, SMTP_HOST is not set correctly

### 5.2 Send Test Email via Application

**Option A: Trigger a Welcome Email (if user registration is available)**
1. Register a new user in the application
2. Check if welcome email is received
3. Check Render logs for send confirmation or errors

**Option B: Trigger a Password Reset Email**
1. Go to login page
2. Click "Forgot Password"
3. Enter a verified email address
4. Check if reset email is received

**Option C: Use AWS SES Console Test**
1. Go to SES Console → Verified Identities
2. Select your verified email/domain
3. Click "Send test email"
4. Enter recipient (must be verified if in sandbox mode)
5. Send and verify receipt

### 5.3 Check for Common Errors

**If emails aren't sending, check Render logs for:**

**Error: "Invalid login: 535 Authentication Credentials Invalid"**
- Fix: Double-check SMTP_USER and SMTP_PASSWORD are correct
- Verify no extra spaces in credentials

**Error: "Email address is not verified"**
- Fix: Only verified addresses can send emails in sandbox mode
- Verify sender email in SES Console (Step 2)

**Error: "Missing credentials in config"**
- Fix: SMTP_USER or SMTP_PASSWORD not set in Render
- Add missing environment variables (Step 4)

**Error: "Daily sending quota exceeded"**
- Fix: You've hit the 200 email/day sandbox limit
- Request production access (Step 6)

**Error: "Timeout connecting to SMTP server"**
- Fix: SMTP_PORT might be wrong (should be 587)
- Check if Render firewall is blocking outbound SMTP

---

## Step 6: Request Production Access (Remove Sandbox Restrictions)

### When to Request Production Access

**Request production access if:**
- You need to send to unverified email addresses (e.g., all tenants)
- You need to send more than 200 emails per day
- You're ready to launch to real users

### 6.1 Request Production Access

**Steps:**
1. Go to SES Console → Account Dashboard
2. Click "Request production access" button
3. Fill out the request form:

**Use Case Description Example:**
```
PropertyMaster is a property management software platform that sends
transactional emails to property managers, tenants, and vendors.

Email types:
- Welcome emails for new users
- Rent payment confirmations
- Work order notifications
- Lease renewal reminders
- Password reset requests
- Security alerts

Expected volume: 500-1,000 emails per day

All emails are opt-in and transactional (not marketing). Users can
unsubscribe from optional notifications in their account settings.

Bounce and complaint handling: We monitor bounce and complaint rates
via SES event publishing and automatically suppress addresses that
generate bounces or complaints.
```

**Additional Questions:**
- Will you comply with AWS policies? **Yes**
- Do you have a process to handle bounces/complaints? **Yes**
- Website URL: Your application URL (e.g., `https://propertymaster.io`)
- Additional contacts: Leave blank or add team email

**Expected Approval Time:** 24-48 hours (usually within 24 hours)

### 6.2 After Approval

**Once approved:**
- Sandbox restrictions removed
- Default sending quota: 200 emails per day (increases automatically over time)
- Default sending rate: 1 email per second (increases automatically)
- Can send to any email address (not just verified addresses)

**To increase limits further:**
- AWS automatically increases limits based on sending patterns
- Or manually request increase via SES Console → Account Dashboard → Request increase

---

## Step 7: Set Up Bounce and Complaint Handling (Recommended)

### Why This Matters

**AWS monitors email reputation:**
- Bounce rate should be < 5%
- Complaint rate should be < 0.1%
- High rates can suspend your SES account

### 7.1 Configure SNS for Bounce/Complaint Notifications

**Steps:**
1. Go to SES Console → Verified Identities
2. Select your email/domain
3. Go to "Notifications" tab
4. Click "Edit" for Configuration set
5. Enable:
   - Bounces → Create new SNS topic: `propertymaster-ses-bounces`
   - Complaints → Create new SNS topic: `propertymaster-ses-complaints`
6. Click "Save changes"

### 7.2 Subscribe to SNS Topics (Optional)

**If you want email notifications:**
1. Go to SNS Console
2. Select `propertymaster-ses-bounces` topic
3. Click "Create subscription"
4. Protocol: Email
5. Endpoint: Your admin email
6. Confirm subscription via email

### 7.3 Implement Bounce Handling (Future Enhancement)

**Backend implementation needed:**
- Create webhook endpoint to receive SNS notifications
- Parse bounce/complaint notifications
- Mark email addresses as invalid in database
- Prevent sending to bounced addresses

**See:** `packages/backend/src/email/email.service.ts` for future implementation

---

## Step 8: Monitor Email Sending

### 8.1 SES Dashboard Metrics

**Go to:** SES Console → Account Dashboard

**Monitor:**
- Bounce rate (should be < 5%)
- Complaint rate (should be < 0.1%)
- Sending quota usage
- Sending rate

### 8.2 Render Application Logs

**Check regularly:**
1. Go to Render dashboard → Logs
2. Filter for `[EmailService]` logs
3. Look for:
   - Successful sends: `Email sent successfully`
   - Errors: `Failed to send email`

### 8.3 Set Up CloudWatch Alarms (Advanced)

**If you want proactive monitoring:**
1. Go to CloudWatch Console
2. Create alarms for:
   - Bounce rate > 3%
   - Complaint rate > 0.05%
   - Daily send volume approaching quota
3. Configure SNS notifications to your email

---

## Step 9: Cost Estimation

### Amazon SES Pricing (as of 2025)

**Sending:**
- $0.10 per 1,000 emails sent
- First 62,000 emails sent per month are FREE (if sent from EC2)
- From Render (not EC2): $0.10 per 1,000 from first email

**Data Transfer:**
- $0.12 per GB of attachments (most emails are < 1 MB)

**Examples:**

| Monthly Emails | Cost |
|----------------|------|
| 1,000 | $0.10 |
| 10,000 | $1.00 |
| 100,000 | $10.00 |
| 1,000,000 | $100.00 |

**Comparison:**
- SendGrid: $15/month for 40,000 emails = $0.375 per 1,000
- Mailgun: $35/month for 50,000 emails = $0.70 per 1,000
- Amazon SES: $0.10 per 1,000 ✅ **Cheapest**

---

## Quick Reference: All Required Values

### AWS SES (must be set up first)

```
Region: us-east-1
Verified Identity: noreply@yourdomain.com (or your domain)
SMTP Username: AKIAXXXXXXXXXXXXXXXXX (from SES SMTP Settings)
SMTP Password: BPxxxxxxxxxxxxxxxxxxxxxxxxx (from SES SMTP Settings)
```

### Render Environment Variables (must be added)

```bash
# Already configured in render.yaml (don't change):
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
EMAIL_FROM_NAME=PropertyMaster

# Must be added manually in Render dashboard:
SMTP_USER=AKIAXXXXXXXXXXXXXXXXX        # Your SES SMTP username
SMTP_PASSWORD=BPxxxxxxxxxxxxxxxxx      # Your SES SMTP password
EMAIL_FROM=noreply@yourdomain.com      # Your verified sender email
SMTP_FROM=noreply@yourdomain.com       # Same as EMAIL_FROM
```

### .env (for local development only)

```bash
# Add to packages/backend/.env:
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAXXXXXXXXXXXXXXXXX
SMTP_PASSWORD=BPxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
SMTP_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=PropertyMaster
SMTP_SECURE=false
```

---

## Verification Checklist Summary

### AWS SES Setup
- [ ] AWS account with SES access in us-east-1
- [ ] At least one email address or domain verified
- [ ] SMTP credentials created and saved securely
- [ ] Account status checked (sandbox or production)
- [ ] Production access requested (if needed)
- [ ] Bounce/complaint notifications configured

### Render Configuration
- [ ] SMTP_USER added to Render environment variables
- [ ] SMTP_PASSWORD added to Render environment variables
- [ ] EMAIL_FROM added to Render environment variables
- [ ] SMTP_FROM added to Render environment variables
- [ ] Application redeployed after adding variables
- [ ] Logs show: "Email provider initialized: smtp"

### Testing
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam folder)
- [ ] No errors in Render logs
- [ ] Bounce rate < 5%
- [ ] Complaint rate < 0.1%

---

## Troubleshooting Guide

### Problem: Emails Not Sending

**Check:**
1. Render logs for `[EmailService]` initialization
2. All 4 SMTP environment variables are set in Render
3. No extra spaces/newlines in credentials
4. Sender email is verified in SES Console
5. If in sandbox mode, recipient email is also verified

### Problem: Emails Going to Spam

**Solutions:**
- Verify entire domain (not just email) in SES
- Enable DKIM signing (automatic with domain verification)
- Set up SPF record: `v=spf1 include:amazonses.com ~all`
- Set up DMARC record: `v=DMARC1; p=none; rua=mailto:admin@yourdomain.com`
- Use a professional sender name (already set: PropertyMaster)
- Avoid spam trigger words in subject lines

### Problem: "Daily Sending Quota Exceeded"

**Solutions:**
- Request production access (removes 200/day limit)
- Wait 24 hours for quota to reset
- Request quota increase via SES Console

### Problem: High Bounce Rate

**Causes:**
- Invalid email addresses in database
- Typos in tenant email addresses
- Abandoned email accounts

**Solutions:**
- Validate email format before saving to database
- Use double opt-in for email verification
- Implement bounce handling webhook
- Clean email list regularly

---

## Next Steps After SES Setup Complete

**Once emails are sending successfully:**

1. **Update Email Templates** (optional improvements)
   - Location: `packages/backend/src/email/templates/`
   - Customize branding, colors, copy
   - Test all 15 email types

2. **Implement Unsubscribe** (required for CAN-SPAM compliance)
   - Add unsubscribe link to marketing emails
   - Create unsubscribe preferences page
   - Honor unsubscribe requests within 10 days

3. **Set Up Email Analytics**
   - Track open rates (via tracking pixel)
   - Track click rates (via tracked links)
   - Monitor delivery rates
   - A/B test subject lines

4. **Implement Bounce Handling**
   - Create webhook endpoint for SNS notifications
   - Mark bounced emails as invalid
   - Prevent re-sending to bounced addresses

5. **Monitor Email Reputation**
   - Check SES dashboard weekly
   - Keep bounce rate < 5%
   - Keep complaint rate < 0.1%
   - Respond to complaints quickly

---

## Support Resources

- **AWS SES Documentation:** https://docs.aws.amazon.com/ses/
- **Render Environment Variables:** https://render.com/docs/environment-variables
- **Email Service Code:** `packages/backend/src/email/email.service.ts`
- **Email Templates:** `packages/backend/src/email/templates/`
- **SES SMTP Settings:** https://console.aws.amazon.com/ses/home?region=us-east-1#/smtp
- **SES Verified Identities:** https://console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities

---

**Last Updated:** January 23, 2026
