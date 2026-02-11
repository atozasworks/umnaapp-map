# Environment Variables Verification

## ✅ Required Variables (Used in Code)

### Server
- ✅ `PORT` - Used in `server.js` (default: 5000)
- ✅ `NODE_ENV` - Used in multiple files (development/production)

### Database
- ✅ `DATABASE_URL` - Used in Prisma (PostgreSQL connection string)

### JWT
- ✅ `JWT_SECRET` - Used in `middleware/auth.js`, `utils/jwt.js`, `middleware/socketAuth.js`
- ✅ `JWT_EXPIRES_IN` - Used in `utils/jwt.js` (default: 7d)

### Email SMTP (Required for OTP)
- ✅ `SMTP_SERVER` - Used in `config/atozasAuth.js`
- ✅ `SMTP_PORT` - Used in `config/atozasAuth.js` (default: 465)
- ✅ `SMTP_SECURE` - Used in `config/atozasAuth.js` (true/false)
- ✅ `SMTP_EMAIL` - Used in `config/atozasAuth.js` (sender email)
- ✅ `SMTP_EMAIL_PASSWORD` - Used in `config/atozasAuth.js` (sender password)

### Google OAuth (Optional)
- ✅ `GOOGLE_CLIENT_ID` - Used in `config/passport.js`, `routes/authRoutes.js`
- ✅ `GOOGLE_CLIENT_SECRET` - Used in `config/passport.js`, `routes/authRoutes.js`
- ✅ `GOOGLE_CALLBACK_URL` - Used in `config/passport.js`

### Frontend
- ✅ `FRONTEND_URL` - Used in `server.js`, `routes/authRoutes.js` (default: http://localhost:3000)

## ❌ Not Used in Code

- ❌ `SMTP_NAME` - **NOT USED** - Can be removed from .env

## 📝 Correct .env Format

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/umnaapp?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Email SMTP
SMTP_SERVER=mail.atozas.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EMAIL=no-reply@atozas.com
SMTP_EMAIL_PASSWORD=your-email-password

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000
```

## ⚠️ Common Mistakes

1. **SMTP_NAME** - This variable is NOT used in code. Remove it if present.
2. **Quotes in DATABASE_URL** - Keep quotes around the connection string
3. **SMTP_SECURE** - Must be string "true" or "false", not boolean
4. **SMTP_EMAIL_PASSWORD** - Must be the actual password, not placeholder

## ✅ Verification Checklist

- [ ] All required variables are present
- [ ] `SMTP_NAME` is removed (not used)
- [ ] `SMTP_EMAIL_PASSWORD` has actual password (not placeholder)
- [ ] `DATABASE_URL` has correct PostgreSQL credentials
- [ ] `JWT_SECRET` is set (not default value)
- [ ] No typos in variable names
- [ ] No extra spaces around `=` sign

