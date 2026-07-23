/**
 * Safe Route Navigation APIs — hazard reports + route safety scoring.
 * Mounted under /api/map so existing auth/rate-limit patterns apply.
 * Does not alter GET /api/map/route behaviour.
 */

import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { randomUUID } from 'crypto'
import prisma from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import {
  HAZARD_TYPES,
  DEFAULT_AVOID_OPTIONS,
  scoreAndTagRoutes,
  routesBoundingBox,
  findNearbyRiskWarning,
  serializeHazard,
} from '../services/safeRouteService.js'

const router = express.Router()

const hasHazardModel = () => Boolean(prisma.safetyHazardReport)

async function fetchApprovedHazardsInBBox(bbox) {
  if (!hasHazardModel() || !bbox) return []
  const now = new Date()
  try {
    return await prisma.safetyHazardReport.findMany({
      where: {
        status: 'approved',
        latitude: { gte: bbox.south, lte: bbox.north },
        longitude: { gte: bbox.west, lte: bbox.east },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.error('[safe-route] hazard lookup failed:', err.message)
    return []
  }
}

/**
 * POST /api/map/safe-route/score
 * Body: { routes: [...], avoidOptions?: {...} }
 * Scores existing OSRM alternatives; tags the safest. Falls back gracefully.
 */
router.post(
  '/safe-route/score',
  authenticateToken,
  rateLimitMiddleware('safe-route-score', 60, 60),
  async (req, res) => {
    try {
      const routes = Array.isArray(req.body?.routes) ? req.body.routes : []
      if (routes.length === 0) {
        return res.status(400).json({ error: 'routes array required' })
      }
      if (routes.length > 8) {
        return res.status(400).json({ error: 'At most 8 routes can be scored' })
      }

      const avoidOptions = { ...DEFAULT_AVOID_OPTIONS, ...(req.body?.avoidOptions || {}) }
      const bbox = routesBoundingBox(routes)
      const hazards = await fetchApprovedHazardsInBBox(bbox)
      const scored = scoreAndTagRoutes(routes, hazards, avoidOptions)

      const safestIndex = scored.findIndex((r) => r.routeTags?.includes('safest'))
      const allAlerts = []
      const seen = new Set()
      for (const r of scored) {
        for (const a of r.safetyAlerts || []) {
          const key = `${a.type}:${a.latitude}:${a.longitude}`
          if (seen.has(key)) continue
          seen.add(key)
          allAlerts.push(a)
        }
      }

      res.json({
        routes: scored,
        safestIndex: safestIndex >= 0 ? safestIndex : 0,
        hazards: hazards.map(serializeHazard),
        alerts: allAlerts,
        fallback: hazards.length === 0,
        message:
          hazards.length === 0
            ? 'Limited safety data — ranking uses road heuristics and best available routing.'
            : undefined,
      })
    } catch (err) {
      console.error('[safe-route] score error:', err)
      // Graceful fallback: return routes unchanged so navigation still works
      const routes = Array.isArray(req.body?.routes) ? req.body.routes : []
      res.json({
        routes: routes.map((r, i) => ({
          ...r,
          safetyScore: 70,
          riskySegmentCount: 0,
          riskySegments: [],
          safetyAlerts: [],
          safetyReasons: {
            safe: [
              {
                id: 'limited_data',
                message: 'Limited safety data — using road heuristics only',
                detail: null,
                impact: 0,
              },
            ],
            risk: [],
          },
          routeTags: [...(r.routeTags || []), ...(i === 0 ? ['safest'] : [])],
          safetyDataAvailable: false,
        })),
        safestIndex: 0,
        hazards: [],
        alerts: [],
        fallback: true,
        message: 'Safety scoring unavailable — using best available routing.',
      })
    }
  }
)

/**
 * GET /api/map/safe-route/hazards?bbox=west,south,east,north
 * Public-to-auth list of approved hazards in a bounding box.
 */
router.get(
  '/safe-route/hazards',
  authenticateToken,
  rateLimitMiddleware('safe-route-hazards', 90, 60),
  [
    query('bbox').optional().isString(),
    query('lat').optional().isFloat(),
    query('lng').optional().isFloat(),
    query('radius').optional().isFloat(),
  ],
  async (req, res) => {
    try {
      if (!hasHazardModel()) {
        return res.json({ hazards: [], fallback: true })
      }

      let bbox = null
      if (req.query.bbox) {
        const parts = String(req.query.bbox).split(',').map(Number)
        if (parts.length === 4 && parts.every(Number.isFinite)) {
          bbox = { west: parts[0], south: parts[1], east: parts[2], north: parts[3] }
        }
      } else if (req.query.lat != null && req.query.lng != null) {
        const lat = Number(req.query.lat)
        const lng = Number(req.query.lng)
        const radiusKm = Math.min(50, Math.max(0.5, Number(req.query.radius) || 5))
        const pad = radiusKm / 111
        bbox = {
          south: lat - pad,
          north: lat + pad,
          west: lng - pad,
          east: lng + pad,
        }
      }

      if (!bbox) {
        return res.status(400).json({ error: 'bbox or lat/lng required' })
      }

      const hazards = await fetchApprovedHazardsInBBox(bbox)
      res.json({ hazards: hazards.map(serializeHazard), fallback: false })
    } catch (err) {
      console.error('[safe-route] list hazards:', err)
      res.json({ hazards: [], fallback: true })
    }
  }
)

/**
 * POST /api/map/safe-route/hazards — submit a community hazard report (pending moderation).
 */
router.post(
  '/safe-route/hazards',
  authenticateToken,
  rateLimitMiddleware('safe-route-report', 20, 60),
  [
    body('type').isIn(HAZARD_TYPES).withMessage('Invalid hazard type'),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('severity').optional().isInt({ min: 1, max: 5 }),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('roadName').optional().isString().isLength({ max: 200 }),
    body('expiresInHours').optional().isInt({ min: 1, max: 720 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      if (!hasHazardModel()) {
        return res.status(503).json({ error: 'Hazard reporting is not available yet' })
      }

      const {
        type,
        latitude,
        longitude,
        severity = 3,
        description,
        roadName,
        expiresInHours,
      } = req.body

      const expiresAt =
        expiresInHours != null
          ? new Date(Date.now() + Number(expiresInHours) * 3600 * 1000)
          : new Date(Date.now() + 72 * 3600 * 1000)

      const row = await prisma.safetyHazardReport.create({
        data: {
          id: randomUUID(),
          userId: req.user.id,
          type,
          latitude: Number(latitude),
          longitude: Number(longitude),
          severity: Number(severity) || 3,
          description: description ? String(description).trim() : null,
          roadName: roadName ? String(roadName).trim() : null,
          status: 'pending',
          expiresAt,
        },
      })

      res.status(201).json({
        hazard: serializeHazard(row),
        message: 'Report submitted for moderation. It will appear on the map after approval.',
      })
    } catch (err) {
      console.error('[safe-route] create hazard:', err)
      res.status(500).json({ error: 'Failed to submit report' })
    }
  }
)

/**
 * GET /api/map/safe-route/my-reports — caller's own reports (any status).
 */
router.get(
  '/safe-route/my-reports',
  authenticateToken,
  rateLimitMiddleware('safe-route-mine', 30, 60),
  async (req, res) => {
    try {
      if (!hasHazardModel()) return res.json({ hazards: [] })
      const rows = await prisma.safetyHazardReport.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      res.json({ hazards: rows.map(serializeHazard) })
    } catch (err) {
      console.error('[safe-route] my-reports:', err)
      res.status(500).json({ error: 'Failed to load reports' })
    }
  }
)

/**
 * POST /api/map/safe-route/monitor
 * Body: { location, riskySegments, routes?, avoidOptions? }
 * Used during navigation to warn about nearby risks and optionally suggest safer alts.
 */
router.post(
  '/safe-route/monitor',
  authenticateToken,
  rateLimitMiddleware('safe-route-monitor', 120, 60),
  async (req, res) => {
    try {
      const location = req.body?.location
      const riskySegments = Array.isArray(req.body?.riskySegments) ? req.body.riskySegments : []
      const warning = findNearbyRiskWarning(location, riskySegments)

      let saferRoute = null
      const routes = Array.isArray(req.body?.routes) ? req.body.routes : []
      if (routes.length > 1) {
        const avoidOptions = { ...DEFAULT_AVOID_OPTIONS, ...(req.body?.avoidOptions || {}) }
        const bbox = routesBoundingBox(routes)
        const hazards = await fetchApprovedHazardsInBBox(bbox)
        const scored = scoreAndTagRoutes(routes, hazards, avoidOptions)
        const currentScore = Number(req.body?.currentSafetyScore)
        const safest = scored.find((r) => r.routeTags?.includes('safest')) || scored[0]
        if (
          safest &&
          Number.isFinite(currentScore) &&
          safest.safetyScore >= currentScore + 8 &&
          (safest.riskySegmentCount ?? 0) < (riskySegments.length || Infinity)
        ) {
          saferRoute = safest
        }
      }

      res.json({
        warning,
        saferRouteAvailable: Boolean(saferRoute),
        saferRoute,
      })
    } catch (err) {
      console.error('[safe-route] monitor:', err)
      res.json({ warning: null, saferRouteAvailable: false, saferRoute: null })
    }
  }
)

export default router
