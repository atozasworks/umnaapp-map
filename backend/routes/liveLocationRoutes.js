import express from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import {
  LIVE_LOCATION_DURATIONS,
  createLiveLocationShare,
  exchangeLiveLocationToken,
  expireDueLiveLocationShares,
  getActiveOwnedLiveLocationShare,
  getLiveLocationParticipantShare,
  rotateLiveLocationToken,
  serializeLiveLocationShare,
  stopLiveLocationShare,
} from '../services/liveLocationService.js'

const router = express.Router()

router.use(authenticateToken)
router.use(rateLimitMiddleware('live-location', 120, 60))

function modelUnavailable(res) {
  return res.status(503).json({
    error: 'Live location unavailable',
    message:
      'Run backend/prisma/add-live-location-sharing.sql, then `npx prisma generate` and restart the server.',
  })
}

function handle(fn) {
  return async (req, res) => {
    if (!prisma.liveLocationShare || !prisma.liveLocationViewer) return modelUnavailable(res)
    try {
      await fn(req, res)
    } catch (error) {
      if (error?.code === 'P2021' || error?.code === 'P2022') return modelUnavailable(res)
      console.error('[live-location]', req.method, req.path, error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

function validate(req, res) {
  const errors = validationResult(req)
  if (errors.isEmpty()) return true
  res.status(400).json({ errors: errors.array() })
  return false
}

router.post(
  '/shares',
  [
    body('durationMinutes').custom(
      (value) => Number.isInteger(value) && LIVE_LOCATION_DURATIONS.includes(value)
    ),
  ],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const { share, token } = await createLiveLocationShare(req.user.id, req.body.durationMinutes)
    res.status(201).json({
      share: serializeLiveLocationShare(share, req.user.id),
      token,
    })
  })
)

router.get(
  '/shares',
  handle(async (req, res) => {
    await expireDueLiveLocationShares()
    const userId = req.user.id
    const shares = await prisma.liveLocationShare.findMany({
      where: { OR: [{ ownerId: userId }, { viewers: { some: { userId } } }] },
      include: {
        owner: { select: { id: true, name: true, picture: true } },
        _count: { select: { viewers: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    shares.sort((a, b) => {
      const activeDifference = Number(b.status === 'active') - Number(a.status === 'active')
      return activeDifference || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
    res.json({ shares: shares.map((share) => serializeLiveLocationShare(share, userId)) })
  })
)

router.get(
  '/shares/active',
  handle(async (req, res) => {
    const share = await getActiveOwnedLiveLocationShare(req.user.id)
    res.json({
      share: share ? serializeLiveLocationShare(share, req.user.id) : null,
    })
  })
)

router.post(
  '/shares/:id/rotate-token',
  handle(async (req, res) => {
    const result = await rotateLiveLocationToken(req.params.id, req.user.id)
    if (!result) return res.status(404).json({ error: 'Live-location share not found' })
    res.json({
      share: serializeLiveLocationShare(result.share, req.user.id),
      token: result.token,
    })
  })
)

router.post(
  '/exchange',
  [body('token').isString().trim().isLength({ min: 20, max: 256 })],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const share = await exchangeLiveLocationToken(req.body.token, req.user.id, {
      name: req.user.name,
    })
    if (!share) return res.status(404).json({ error: 'Live-location share not found' })
    res.json({ share: serializeLiveLocationShare(share, req.user.id) })
  })
)

router.get(
  '/shares/:id',
  handle(async (req, res) => {
    const share = await getLiveLocationParticipantShare(req.params.id, req.user.id)
    if (!share) return res.status(404).json({ error: 'Live-location share not found' })
    res.json({ share: serializeLiveLocationShare(share, req.user.id) })
  })
)

router.post(
  '/shares/:id/stop',
  handle(async (req, res) => {
    const share = await stopLiveLocationShare(req.params.id, req.user.id)
    if (!share) return res.status(404).json({ error: 'Live-location share not found' })
    res.json({ share: serializeLiveLocationShare(share, req.user.id) })
  })
)

export default router
