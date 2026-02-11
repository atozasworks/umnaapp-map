# Atozas Auth Kit Integration Guide

## Overview

UMNAAPP now uses **atozas-auth-kit-express** (backend) and **atozas-react-auth-kit** (frontend) for Gmail OTP functionality.

## Backend Integration

### Package: `atozas-auth-kit-express`

**Location:** `backend/config/atozasAuth.js`

**Features:**
- Gmail OTP generation and sending
- OTP verification
- Automatic fallback to existing implementation if package is not available

**Configuration:**
The package is initialized with your SMTP settings from `.env`:
```env
SMTP_SERVER=mail.atozas.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EMAIL=no-reply@atozas.com
SMTP_EMAIL_PASSWORD=your_password
```

**Usage in Controllers:**
- `register()` - Uses `atozasAuth.generateOTP()` for registration OTP
- `loginWithOTP()` - Uses `atozasAuth.generateOTP()` for login OTP
- `verifyOTP()` - Uses `atozasAuth.verifyOTP()` for OTP verification

## Frontend Integration

### Package: `atozas-react-auth-kit`

**Location:** `frontend/src/hooks/useAtozasAuth.js`

**Features:**
- React hook wrapper for OTP operations
- Simplified API for sending and verifying OTPs

**Usage:**
```javascript
import { useAtozasAuth } from '../hooks/useAtozasAuth'

const { sendOTP, verifyOTP, resendOTP } = useAtozasAuth()

// Send OTP
await sendOTP(email, 'register')

// Verify OTP
await verifyOTP(email, otp, 'register')
```

## How It Works

1. **Registration Flow:**
   - User enters name, email, and optional password
   - Backend uses `atozasAuth.generateOTP()` to create and send OTP via Gmail
   - OTP is stored in database
   - User receives email with 6-digit OTP
   - User verifies OTP using `atozasAuth.verifyOTP()`

2. **Login Flow:**
   - User enters email
   - Backend uses `atozasAuth.generateOTP()` to send login OTP
   - User verifies OTP to login

## Fallback Mechanism

If the `atozas-auth-kit-express` package is not available or has issues:
- The system automatically falls back to the existing email service
- Uses `nodemailer` with your SMTP configuration
- Maintains full functionality

## Testing

1. **Test Registration:**
   ```bash
   POST http://localhost:5000/api/auth/register
   Body: { "name": "Test User", "email": "test@example.com" }
   ```

2. **Test OTP Verification:**
   ```bash
   POST http://localhost:5000/api/auth/verify-otp
   Body: { "email": "test@example.com", "otp": "123456", "type": "register" }
   ```

3. **Check Server Logs:**
   - Look for: `✅ Atozas Auth Kit initialized successfully`
   - Or: `⚠️  atozas-auth-kit-express not available, using fallback`

## Troubleshooting

### OTP Not Received
1. Check SMTP credentials in `.env`
2. Verify `SMTP_EMAIL_PASSWORD` is correct
3. Check server logs for email errors
4. Verify email is not in spam folder

### Package Not Found
- The system will automatically use fallback implementation
- Check `node_modules` for package installation
- Run: `npm install atozas-auth-kit-express` in backend

### Integration Issues
- Check server logs for initialization messages
- Verify package exports match expected API
- Fallback will ensure functionality continues

## Environment Variables Required

```env
# SMTP Configuration (for Gmail OTP)
SMTP_SERVER=mail.atozas.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EMAIL=no-reply@atozas.com
SMTP_EMAIL_PASSWORD=your_actual_password

# JWT (for tokens)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## Notes

- The integration is **backward compatible** - existing functionality is preserved
- If atozas packages have different APIs, update `backend/config/atozasAuth.js`
- Frontend hook can be customized in `frontend/src/hooks/useAtozasAuth.js`
- All OTP operations go through the atozas packages when available

