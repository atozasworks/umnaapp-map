# UMNAAPP Project Structure

## Overview

This is a full-stack production-ready web application with the following architecture:

- **Frontend**: React.js (Vite) + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Realtime**: Socket.io
- **Authentication**: Email OTP + Google OAuth

## Directory Structure

```
umnaapp/
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   │   └── ProtectedRoute.jsx
│   │   ├── contexts/           # React Context providers
│   │   │   ├── AuthContext.jsx # Authentication state
│   │   │   └── SocketContext.jsx # Socket.io connection
│   │   ├── pages/              # Page components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── OTPVerificationPage.jsx
│   │   │   └── HomePage.jsx
│   │   ├── services/           # API services
│   │   │   └── api.js          # Axios configuration
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Global styles + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                     # Node.js backend application
│   ├── config/                 # Configuration files
│   │   ├── database.js         # Prisma client
│   │   ├── email.js            # Email service (Nodemailer)
│   │   └── passport.js         # Google OAuth setup
│   ├── controllers/            # Route controllers
│   │   └── authController.js   # Authentication logic
│   ├── middleware/             # Express middleware
│   │   ├── auth.js             # JWT authentication
│   │   └── socketAuth.js       # Socket.io authentication
│   ├── routes/                 # API routes
│   │   └── authRoutes.js       # Authentication routes
│   ├── utils/                  # Utility functions
│   │   ├── jwt.js              # JWT token management
│   │   └── otp.js              # OTP generation
│   ├── prisma/                 # Prisma ORM
│   │   └── schema.prisma       # Database schema
│   ├── server.js               # Main server file
│   ├── package.json
│   └── env.example.txt         # Environment variables template
│
├── package.json                # Root package.json (workspace)
├── README.md                   # Main documentation
├── SETUP.md                    # Quick setup guide
├── DEPLOYMENT.md               # VPS deployment guide
└── .gitignore
```

## Key Features

### Frontend

1. **Landing Page**: Public homepage with hero section
2. **Authentication Pages**: Login, Register, OTP Verification
3. **Homepage**: Fullscreen map display after login
4. **Protected Routes**: Route guards for authenticated users
5. **Real-time**: Socket.io client integration

### Backend

1. **Authentication System**:
   - Email OTP registration
   - Email OTP login
   - Google OAuth integration
   - JWT session management

2. **Database Models**:
   - `User`: User accounts
   - `OTPVerification`: OTP codes
   - `Session`: Active sessions

3. **Real-time**: Socket.io server with authentication

## Technology Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Socket.io Client
- JWT Decode

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Socket.io
- Passport.js (Google OAuth)
- Nodemailer (Email OTP)
- JWT
- Bcrypt

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 5000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `SMTP_*`: Email configuration
- `GOOGLE_*`: Google OAuth credentials
- `FRONTEND_URL`: Frontend application URL

### Frontend (.env)
- `VITE_API_URL`: Backend API URL

## API Endpoints

### Public
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Request login OTP
- `POST /api/auth/verify-otp` - Verify OTP code
- `GET /api/auth/google` - Google OAuth login
- `GET /api/health` - Health check

### Protected (Requires JWT)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

## Database Schema

### User
- id (UUID)
- name (String)
- email (String, unique)
- password (String, optional)
- googleId (String, optional, unique)
- emailVerified (Boolean)
- timestamps

### OTPVerification
- id (UUID)
- email (String)
- otp (String)
- type (String: 'register' | 'login')
- expiresAt (DateTime)
- verified (Boolean)
- userId (Foreign Key)

### Session
- id (UUID)
- userId (Foreign Key)
- token (String, unique)
- expiresAt (DateTime)
- timestamps

## Security Features

1. **JWT Authentication**: Secure token-based auth
2. **Password Hashing**: Bcrypt for password storage
3. **OTP Expiry**: 10-minute expiration for OTPs
4. **Session Management**: Database-backed sessions
5. **CORS**: Configured for frontend origin
6. **Input Validation**: Express-validator for request validation

## Development Workflow

1. Install dependencies: `npm run install:all`
2. Setup database: Create PostgreSQL database and run migrations
3. Configure environment: Copy and edit `.env` files
4. Run development: `npm run dev`
5. Access: Frontend (http://localhost:3000), Backend (http://localhost:5000)

## Production Deployment

See `DEPLOYMENT.md` for detailed VPS deployment instructions.

Key steps:
1. Setup server (Node.js, PostgreSQL, Nginx)
2. Build frontend: `npm run build`
3. Run database migrations
4. Configure Nginx reverse proxy
5. Setup SSL with Let's Encrypt
6. Run with PM2

