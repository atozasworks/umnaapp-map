import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import passport from './config/passport.js'
import authRoutes from './routes/authRoutes.js'
import atozasAuthRoutes from './routes/atozasAuthRoutes.js'
import testRoutes from './routes/testRoutes.js'
import mapRoutes from './routes/mapRoutes.js'
import vehicleRoutes from './routes/vehicleRoutes.js'
import { authenticateSocket } from './middleware/socketAuth.js'
import prisma from './config/database.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api', atozasAuthRoutes) // Atozas Auth Kit routes (/api/email/send-otp, /api/email/verify-otp, /api/me)
app.use('/api/test', testRoutes)
app.use('/api/map', mapRoutes) // Map services (routing, search, reverse geocoding)
app.use('/api/vehicles', vehicleRoutes) // Vehicle management

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UMNAAPP API is running' })
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

