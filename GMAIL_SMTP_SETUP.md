# Gmail SMTP Setup for OTP Emails

## Issue
Emails from `mail.atozas.com` are being sent successfully but not reaching Gmail (not even in spam).

## Solution: Use Gmail SMTP Directly

### Option 1: Use Gmail SMTP (Recommended for Testing)

Update `backend/.env`:

```env
# Gmail SMTP Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_EMAIL=your-gmail@gmail.com
SMTP_EMAIL_PASSWORD=your-app-password
```

**Important:** For Gmail, you need to:
1. Enable 2-Step Verification on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular Gmail password)

### Option 2: Check atozas.com Email Server

The issue might be:
- SPF records not configured for atozas.com
- DKIM not set up
- Domain reputation issue
- Gmail blocking atozas.com domain

**To fix atozas.com email:**
1. Check SPF records in DNS
2. Set up DKIM signing
3. Check domain reputation
4. Contact email server administrator

### Option 3: Use Different Email Service

Consider using:
- SendGrid
- Mailgun
- AWS SES
- Resend

## Quick Test

After updating to Gmail SMTP:
1. Restart server
2. Try registration again
3. Check Gmail inbox (should arrive immediately)

