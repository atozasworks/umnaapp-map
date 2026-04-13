import './loadEnv.js' // Load backend/.env regardless of process cwd
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { Server } from 'socket.io'
import passport from './config/passport.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import authRoutes from './routes/authRoutes.js'
import atozasAuthRoutes from './routes/atozasAuthRoutes.js'
import testRoutes from './routes/testRoutes.js'
import mapRoutes from './routes/mapRoutes.js'
import vehicleRoutes from './routes/vehicleRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import { authenticateSocket } from './middleware/socketAuth.js'
import prisma from './config/database.js'
import { startPlaceApprovalScheduler } from './services/placeApproval.js'

const defaultOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.ADMIN_URL || 'http://localhost:5174',
].filter(Boolean)

const corsOrigin =
  process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) || defaultOrigins

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (corsOrigin.includes(origin)) return callback(null, true)
      callback(null, false)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
app.use(passport.initialize())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api', atozasAuthRoutes) // Atozas Auth Kit routes (/api/email/send-otp, /api/email/verify-otp, /api/me)
app.use('/api/test', testRoutes)
app.use('/api/map', mapRoutes) // Map services (routing, search, reverse geocoding)
app.use('/api/vehicles', vehicleRoutes) // Vehicle management
app.use('/api/admin', adminRoutes) // Database admin (ADMIN_SECRET required)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UMNAAPP API is running' })
})

// Admin panel at /admin: env, or ../admin/dist (repo), or ./admin/dist (common on server under backend/)
const adminBuildPath = (() => {
  if (process.env.ADMIN_BUILD_PATH) return process.env.ADMIN_BUILD_PATH
  const sibling = path.join(__dirname, '../admin/dist')
  if (fs.existsSync(sibling)) return sibling
  const insideBackend = path.join(__dirname, 'admin/dist')
  if (fs.existsSync(insideBackend)) return insideBackend
  return path.join(__dirname, 'admin-dist')
})()
const adminIndexFile = path.join(adminBuildPath, 'index.html')
console.log(
  `📁 Admin UI: ${adminBuildPath} (exists: ${fs.existsSync(adminBuildPath)}, index.html: ${fs.existsSync(adminIndexFile)})`
)
app.use('/admin', express.static(adminBuildPath))

// Serve frontend build (production: set FRONTEND_BUILD_PATH)
const buildPath = process.env.FRONTEND_BUILD_PATH || 
  (fs.existsSync(path.join(__dirname, 'build')) ? path.join(__dirname, 'build') :
   fs.existsSync(path.join(__dirname, '../frontend/dist')) ? path.join(__dirname, '../frontend/dist') :
   path.join(__dirname, 'dist'))
const indexFile = path.join(buildPath, 'index.html')
console.log(`📁 Serving frontend from: ${buildPath} (exists: ${fs.existsSync(buildPath)}, index.html: ${fs.existsSync(indexFile)})`)
app.use(express.static(buildPath))
// Explicit root + SPA fallback
const serveIndex = (req, res, next) => {
  res.sendFile(indexFile, (err) => {
    if (err) {
      console.error('sendFile error:', err.message)
      res.status(500).send('Frontend build not found. Run: cd frontend && npm run build (creates frontend/dist)')
    }
  })
}
const serveAdminIndex = (req, res, next) => {
  if (!fs.existsSync(adminIndexFile)) {
    return res
      .status(503)
      .send('Admin build not found. Run: cd admin && npm run build (creates admin/dist), or set ADMIN_BUILD_PATH.')
  }
  res.sendFile(adminIndexFile, (err) => {
    if (err) {
      console.error('sendFile admin error:', err.message)
      res.status(500).send('Failed to serve admin UI')
    }
  })
}
app.get('/', serveIndex)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  if (req.path === '/admin' || req.path.startsWith('/admin/')) {
    return serveAdminIndex(req, res, next)
  }
  serveIndex(req, res, next)
})

// Socket.io connection handling
io.use(authenticateSocket)

io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.userId}`)

  // Join user's personal room
  socket.join(`user:${socket.userId}`)

  // Emit connection status
  socket.emit('connected', {
    message: 'Connected to UMNAAPP',
    userId: socket.userId,
  })

  // Vehicle tracking: Join vehicle room
  socket.on('vehicle:join', async (data) => {
    const { vehicleId } = data
    if (!vehicleId) {
      return socket.emit('error', { message: 'Vehicle ID required' })
    }

    // Verify user owns the vehicle
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: socket.userId,
      },
    })

    if (!vehicle) {
      return socket.emit('error', { message: 'Vehicle not found or access denied' })
    }

    socket.join(`vehicle:${vehicleId}`)
    socket.emit('vehicle:joined', { vehicleId })
    console.log(`User ${socket.userId} joined vehicle room: ${vehicleId}`)
  })

  // Vehicle tracking: Leave vehicle room
  socket.on('vehicle:leave', (data) => {
    const { vehicleId } = data
    if (vehicleId) {
      socket.leave(`vehicle:${vehicleId}`)
      socket.emit('vehicle:left', { vehicleId })
    }
  })

  // Vehicle location update (from mobile/device)
  socket.on('vehicle:location', async (data) => {
    const { vehicleId, latitude, longitude, accuracy, speed, heading } = data

    if (!vehicleId || !latitude || !longitude) {
      return socket.emit('error', { message: 'Missing required location data' })
    }

    try {
      // Verify vehicle ownership
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: vehicleId,
          userId: socket.userId,
        },
      })

      if (!vehicle) {
        return socket.emit('error', { message: 'Vehicle not found or access denied' })
      }

      // Save location to database
      const location = await prisma.location.create({
        data: {
          vehicleId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : null,
          speed: speed ? parseFloat(speed) : null,
          heading: heading ? parseFloat(heading) : null,
          timestamp: new Date(),
        },
      })

      // Update vehicle status if needed
      if (vehicle.status === 'idle') {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: { status: 'active' },
        })
      }

      // Broadcast location to all clients tracking this vehicle
      const locationData = {
        vehicleId,
        location: {
          id: location.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          timestamp: location.timestamp,
        },
      }

      io.to(`vehicle:${vehicleId}`).emit('vehicle:location:update', locationData)
      console.log(`Location update for vehicle ${vehicleId}:`, locationData.location)
    } catch (error) {
      console.error('Vehicle location error:', error)
      socket.emit('error', { message: 'Failed to update vehicle location', error: error.message })
    }
  })

  // Get active vehicles for user
  socket.on('vehicles:list', async () => {
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: { userId: socket.userId },
        include: {
          locations: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      })

      socket.emit('vehicles:list', { vehicles })
    } catch (error) {
      console.error('Get vehicles error:', error)
      socket.emit('error', { message: 'Failed to fetch vehicles' })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`)
  })

  // Handle custom events
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() })
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

const PORT = process.env.PORT || 5000

httpServer.listen(PORT, () => {
  startPlaceApprovalScheduler()
  console.log(`🚀 UMNAAPP Server running on port ${PORT}`)
  console.log(`📡 Socket.io server ready`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

