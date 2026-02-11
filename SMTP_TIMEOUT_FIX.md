# SMTP Connection Timeout Fix Guide

## Error: `ETIMEDOUT` - Connection Timeout

This error means the application cannot connect to the SMTP server. The connection is timing out before it can establish a connection.

## Quick Fix Checklist

### 1. Verify Your `.env` Configuration (Lines 23-28)

Check your `backend/.env` file and ensure these settings are correct:

#### For Gmail SMTP (Recommended):
```env
SMTP_NAME=Gmail
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_EMAIL=your-email@gmail.com
SMTP_EMAIL_PASSWORD=your-16-char-app-password
```

**Important for Gmail:**
- ✅ Port **587** requires `SMTP_SECURE=false` (uses STARTTLS)
- ✅ Port **465** requires `SMTP_SECURE=true` (uses SSL/TLS)
- ✅ You MUST use an **App Password**, not your regular Gmail password
- ✅ Generate App Password: https://myaccount.google.com/apppasswords
- ✅ Enable 2-Step Verification first

#### For Atozas SMTP:
```env
SMTP_NAME=atozas.com
SMTP_SERVER=mail.atozas.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EMAIL=no-reply@atozas.com
SMTP_EMAIL_PASSWORD=your-email-password
```

### 2. Common Issues and Solutions

#### Issue: Wrong Port/Secure Combination
- **Port 587** → `SMTP_SECURE=false` (STARTTLS)
- **Port 465** → `SMTP_SECURE=true` (SSL/TLS)
- **Wrong combination causes timeout**

#### Issue: Firewall/Antivirus Blocking
- Check if Windows Firewall is blocking port 587 or 465
- Temporarily disable antivirus to test
- Check if your network blocks SMTP ports

#### Issue: Gmail App Password Not Set
- Regular Gmail password won't work
- Must generate App Password from Google Account settings
- App Password is 16 characters (no spaces)

#### Issue: SMTP Server Unreachable
- Test connection: `telnet smtp.gmail.com 587` (or your SMTP server)
- If connection fails, server might be down or blocked
- Try different SMTP server (Gmail is most reliable)

### 3. Test Your Configuration

After updating `.env`, restart your backend server and check the logs:

```bash
cd backend
npm run dev
```

Look for:
- ✅ `✅ SMTP connection verified successfully` - Good!
- ❌ `❌ SMTP connection verification failed` - Check error message

### 4. Manual Connection Test

Test if you can reach the SMTP server:

**Windows (PowerShell):**
```powershell
Test-NetConnection -ComputerName smtp.gmail.com -Port 587
```

**Windows (Command Prompt):**
```cmd
telnet smtp.gmail.com 587
```

If connection fails, the server is unreachable (firewall/network issue).

### 5. Updated Configuration

The code has been updated with:
- ✅ Increased timeout from 10s to 30s
- ✅ Better error messages with troubleshooting steps
- ✅ Improved TLS configuration
- ✅ Better connection diagnostics

### 6. Recommended: Use Gmail SMTP

Gmail SMTP is the most reliable option:

1. Go to https://myaccount.google.com/apppasswords
2. Generate an App Password for "Mail"
3. Copy the 16-character password
4. Update `.env`:
   ```env
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_EMAIL=your-email@gmail.com
   SMTP_EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```
5. Restart server

### 7. Still Not Working?

1. **Check backend logs** - Look for detailed error messages
2. **Verify .env file** - Ensure no typos, no extra spaces
3. **Test with different email** - Try sending to non-Gmail address
4. **Check network** - Try from different network (mobile hotspot)
5. **Contact SMTP provider** - If using custom SMTP, verify server is up

## Error Messages Explained

- `ETIMEDOUT` - Connection timeout (server unreachable or wrong port)
- `ECONNREFUSED` - Connection refused (server down or wrong address)
- `EAUTH` - Authentication failed (wrong email/password)
- `ETLS` - TLS/SSL error (wrong secure setting)

## Next Steps

1. ✅ Update `.env` with correct SMTP settings
2. ✅ Restart backend server
3. ✅ Check startup logs for connection verification
4. ✅ Try sending OTP again
5. ✅ Check error logs for specific issues
