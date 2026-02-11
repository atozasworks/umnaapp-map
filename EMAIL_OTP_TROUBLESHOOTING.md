# Email OTP Troubleshooting Guide

## 🔍 Complete Email OTP Flow Analysis

### 1. Frontend Flow
1. User enters email in `EmailOtpLogin` component
2. Component calls `POST /api/email/send-otp` with `{ email: "user@example.com" }`
3. Backend generates OTP, hashes it, stores in database, and sends email
4. User receives email with OTP code
5. User enters OTP in component
6. Component calls `POST /api/email/verify-otp` with `{ email, otp }`
7. Backend verifies OTP and returns JWT token
8. User is logged in and redirected to home page

### 2. Backend Flow

#### `/api/email/send-otp` Endpoint:
- Validates email format
- Checks rate limiting (3 attempts per 15 minutes)
- Generates 6-digit OTP using `generateOtp(6)`
- Hashes OTP using `hashOtp(otp)` (bcrypt)
- Stores hashed OTP in Prisma database
- Sends email via SMTP using `sendEmailOtp(email, otp)`
- Returns success response

#### `/api/email/verify-otp` Endpoint:
- Validates email and OTP
- Finds unexpired OTP records from database
- Compares plain OTP with hashed OTP using `compareOtp(otp, hashedOtp)`
- Marks OTP as verified
- Creates or updates user
- Generates JWT token
- Returns token and user data

### 3. Email Sending Process

#### SMTP Configuration:
- **Server**: `mail.atozas.com`
- **Port**: `465` (secure)
- **From**: `no-reply@atozas.com`
- **Authentication**: Uses `SMTP_EMAIL` and `SMTP_EMAIL_PASSWORD`

#### Email Content:
- **Subject**: "Your UMNAAPP Verification Code"
- **Format**: HTML + Plain text
- **OTP**: 6-digit code displayed prominently
- **Expiry**: 10 minutes

## 🐛 Common Issues & Solutions

### Issue 1: Email Not Received in Gmail

**Possible Causes:**
1. **SPF/DKIM Records Not Configured**
   - Gmail may block emails from `atozas.com` if SPF/DKIM records are not set up
   - **Solution**: Configure SPF and DKIM records for `atozas.com` domain

2. **Email in Spam Folder**
   - Gmail may filter emails from unknown domains
   - **Solution**: Check Spam/Junk folder, mark as "Not Spam"

3. **Delivery Delay**
   - SMTP server may take 1-2 minutes to deliver
   - **Solution**: Wait 1-2 minutes and check again

4. **Gmail Filters**
   - Gmail may have filters blocking the domain
   - **Solution**: Check Gmail filters and blocked senders list

5. **SMTP Authentication Failed**
   - Incorrect SMTP credentials
   - **Solution**: Verify `SMTP_EMAIL` and `SMTP_EMAIL_PASSWORD` in `.env`

### Issue 2: SMTP Connection Failed

**Check:**
1. Verify SMTP credentials in `.env`:
   ```env
   SMTP_SERVER=mail.atozas.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_EMAIL=no-reply@atozas.com
   SMTP_EMAIL_PASSWORD=your-actual-password
   ```

2. Test SMTP connection:
   ```bash
   # Check backend logs for SMTP verification on startup
   # Should see: "✅ SMTP connection verified successfully"
   ```

3. Use test endpoint:
   ```bash
   POST http://localhost:5000/api/test/test-email
   Body: { "email": "your-email@gmail.com" }
   ```

### Issue 3: OTP Verification Failed

**Check:**
1. OTP is case-sensitive and must match exactly
2. OTP expires after 10 minutes
3. Only the most recent OTP is valid (old OTPs are deleted)
4. OTP is hashed in database, comparison uses bcrypt

## 🧪 Testing Email OTP

### 1. Test SMTP Configuration
```bash
GET http://localhost:5000/api/test/smtp-config
```
This will show your SMTP configuration (password hidden).

### 2. Send Test Email
```bash
POST http://localhost:5000/api/test/test-email
Content-Type: application/json

{
  "email": "your-email@gmail.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test OTP email sent successfully",
  "messageId": "...",
  "accepted": ["your-email@gmail.com"],
  "rejected": [],
  "otp": "123456",
  "note": "Check your email inbox, spam folder, and wait 1-2 minutes for delivery"
}
```

### 3. Check Backend Logs
Look for these log messages:
- `📧 Sending OTP email...`
- `✅ OTP email sent successfully!`
- `Message ID: ...`
- `Accepted recipients: ...`

### 4. Verify Email Delivery
1. Check inbox (primary folder)
2. Check spam/junk folder
3. Check "All Mail" folder
4. Wait 1-2 minutes for delivery
5. Search for "UMNAAPP" in Gmail

## 🔧 Debugging Steps

### Step 1: Verify SMTP Configuration
```bash
# Check .env file
cat backend/.env | grep SMTP

# Should see:
# SMTP_NAME=atozas.com
# SMTP_SERVER=mail.atozas.com
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_EMAIL=no-reply@atozas.com
# SMTP_EMAIL_PASSWORD=your-password
```

### Step 2: Test SMTP Connection
```bash
# Start backend server
cd backend
npm run dev

# Look for this in logs:
# ✅ SMTP connection verified successfully
```

### Step 3: Send Test Email
```bash
# Use curl or Postman
curl -X POST http://localhost:5000/api/test/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@gmail.com"}'
```

### Step 4: Check Email Delivery
1. Open Gmail
2. Check inbox
3. Check spam folder
4. Search for "UMNAAPP"
5. Check "All Mail" folder

### Step 5: Check Server Logs
Look for:
- `📧 Sending OTP email...`
- `✅ OTP email sent successfully!`
- `Message ID: ...`
- `Accepted: ["your-email@gmail.com"]`
- `Rejected: []`

## 📋 Checklist

- [ ] SMTP credentials are correct in `.env`
- [ ] Backend server shows "✅ SMTP connection verified successfully"
- [ ] Test email endpoint returns success
- [ ] Checked Gmail inbox
- [ ] Checked Gmail spam folder
- [ ] Checked "All Mail" folder
- [ ] Waited 1-2 minutes for delivery
- [ ] Verified email is not blocked in Gmail filters
- [ ] SPF/DKIM records are configured for atozas.com (if applicable)

## 🚨 If Email Still Not Received

1. **Check SMTP Server Logs**
   - Contact your SMTP provider (atozas.com) to check server logs
   - Verify that emails are being sent from the server

2. **Use Different Email Provider**
   - Try sending to a different email provider (not Gmail)
   - This will help identify if it's a Gmail-specific issue

3. **Check Domain Reputation**
   - Gmail may block emails from domains with poor reputation
   - Consider using a verified email service (SendGrid, Mailgun, etc.)

4. **Verify SMTP Server Settings**
   - Confirm `mail.atozas.com` is the correct SMTP server
   - Verify port 465 is correct for SSL/TLS
   - Check if SMTP server requires different authentication

## 📞 Support

If emails are still not being received:
1. Check backend logs for detailed error messages
2. Verify SMTP configuration with your email provider
3. Test with a different email address
4. Check if SMTP server has any restrictions or rate limits

