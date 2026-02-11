import express from 'express'
import { body, param, validationResult } from 'express-validator'
import { authenticate } from '../middleware/auth.js'
import prisma from '../config/database.js'

const router = express.Router()

/**
 * @route GET /api/vehicles
 * @desc Get all vehicles for the authenticated user
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { routes: true, locations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ vehicles })
  } catch (error) {
    console.error('Get vehicles error:', error)
    res.status(500).json({ error: 'Failed to fetch vehicles', message: error.message })
  }
})

/**
 * @route POST /api/vehicles
 * @desc Create a new vehicle
 * @access Private
 */
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Vehicle name is required'),
    body('licensePlate').optional().trim(),
    body('type').isIn(['car', 'truck', 'bike', 'motorcycle', 'van', 'other']).withMessage('Invalid vehicle type'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, licensePlate, type } = req.body

      // Check if license plate already exists
      if (licensePlate) {
        const existing = await prisma.vehicle.findUnique({
          where: { licensePlate },
        })
        if (existing) {
          return res.status(400).json({ error: 'License plate already registered' })
        }
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          name,
          licensePlate: licensePlate || null,
          type,
          userId: req.user.id,
          status: 'idle',
        },
      })

      res.status(201).json({ vehicle })
    } catch (error) {
      console.error('Create vehicle error:', error)
      res.status(500).json({ error: 'Failed to create vehicle', message: error.message })
    }
  }
)

/**
 * @route GET /api/vehicles/:id
 * @desc Get a specific vehicle
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        routes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' })
    }

    res.json({ vehicle })
  } catch (error) {
    console.error('Get vehicle error:', error)
    res.status(500).json({ error: 'Failed to fetch vehicle', message: error.message })
  }
})

/**
 * @route PUT /api/vehicles/:id
 * @desc Update a vehicle
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('status').optional().isIn(['idle', 'active', 'maintenance']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      })

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' })
      }

      const updated = await prisma.vehicle.update({
        where: { id: req.params.id },
        data: req.body,
      })

      res.json({ vehicle: updated })
    } catch (error) {
      console.error('Update vehicle error:', error)
      res.status(500).json({ error: 'Failed to update vehicle', message: error.message })
    }
  }
)

/**
 * @route DELETE /api/vehicles/:id
 * @desc Delete a vehicle
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' })
    }

    await prisma.vehicle.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'Vehicle deleted successfully' })
  } catch (error) {
    console.error('Delete vehicle error:', error)
    res.status(500).json({ error: 'Failed to delete vehicle', message: error.message })
  }
})

/**
 * @route GET /api/vehicles/:id/locations
 * @desc Get location history for a vehicle
 * @access Private
 */
router.get('/:id/locations', authenticate, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    })

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' })
    }

    const { limit = 100, startDate, endDate } = req.query

    const locations = await prisma.location.findMany({
      where: {
        vehicleId: req.params.id,
        ...(startDate || endDate
          ? {
              timestamp: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
    })

    res.json({ locations, count: locations.length })
  } catch (error) {
    console.error('Get locations error:', error)
    res.status(500).json({ error: 'Failed to fetch locations', message: error.message })
  }
})

export default router

