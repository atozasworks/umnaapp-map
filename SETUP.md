# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm run install:all
```

## Step 2: Setup Database

1. Create PostgreSQL database:
```sql
CREATE DATABASE umnaapp;
```

2. Copy environment file:
```bash
cd backend
cp env.example.txt .env
```

3. Edit `backend/.env` with your database credentials

4. Run migrations:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

## Step 3: Configure Environment

Edit `backend/.env`:
- Set `DATABASE_URL`
- Set `JWT_SECRET` (generate a random string)
- Set email SMTP credentials
- Set Google OAuth credentials

## Step 4: Run Application

```bash
# From root directory
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:5000

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
4. Copy credentials to `.env`

## Email Setup (Gmail)

1. Enable 2-Step Verification
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password in `SMTP_PASS`

