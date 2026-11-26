/**
 * Open-data place catalogue APIs for the Place Extractor.
 * Mounted under /api/map. Replaces the browser-side Google Places calls:
 * every result here comes from openly licensed data imported into "OpenPlace".
 */
import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import { GRID_EXTRACT_MAX_PLACES, EXTRACT_MAX_AREA_KM2 } from '../utils/gridExtractLimit.js'
import {
  openPlaceStats,
  extractOpenPlaces,
  searchOpenPlaces,
  lookupRegion,
} from '../services/openPlaceQuery.js'
import {
  startRegionJob,
  getRegionJob,
  RegionJobError,
  REGION_JOB_MAX_AREA_KM2,
  REGION_JOB_MAX_PLACES,
} from '../services/openPlaceRegionJob.js'
import { isPlaceDeleteAdmin } from '../utils/placeOwnership.js'
import { ensureAreaImported } from '../services/openPlaceImport.js'

const router = express.Router()

/** Rough bbox area in km² (good enough to enforce the extract area cap). */
function bboxAreaKm2({ minLat, maxLat, minLng, maxLng }) {
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180)
  const heightKm = (maxLat - minLat) * 111.32
  const widthKm = (maxLng - minLng) * 111.32 * Math.cos(midLat)
  return Math.abs(heightKm * widthKm)
}

function parseRing(raw) {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 2000) return null
  const ring = raw.map((p) => [parseFloat(p?.[0]), parseFloat(p?.[1])])
  if (ring.some(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat))) return null
  const [fLng, fLat] = ring[0]
  const [lLng, lLat] = ring[ring.length - 1]
  if (fLng !== lLng || fLat !== lLat) ring.push([fLng, fLat])
  return ring.length >= 4 ? ring : null
}

/**
 * @route GET /api/map/open-places/status
 * @desc Which open datasets are loaded, and how many places each holds
 */
router.get(
  '/open-places/status',
  authenticateToken,
  rateLimitMiddleware('open-places:status', 60, 60),
  async (req, res) => {
    try {
      const stats = await openPlaceStats()
      // onDemand: an area nobody imported yet is downloaded when it is first asked for (see /open-places/ensure).
      res.json({ ...stats, onDemand: stats.available, maxPlaces: GRID_EXTRACT_MAX_PLACES, maxAreaKm2: EXTRACT_MAX_AREA_KM2 })
    } catch (error) {
      console.error('open-places status error:', error)
      res.status(500).json({ error: 'Failed to load open places status' })
    }
  }
)

/**
 * @route GET /api/map/open-places/region?q=
 * @desc Geocode a region name to a bounding box (OpenStreetMap Nominatim)
 */
router.get(
  '/open-places/region',
  authenticateToken,
  rateLimitMiddleware('open-places:region', 30, 60),
  [query('q').trim().isLength({ min: 2, max: 300 }).withMessage('q is required (2-300 chars)')],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const region = await lookupRegion(req.query.q)
      if (!region) return res.status(404).json({ error: 'REGION_NOT_FOUND', message: 'Region not found' })
      res.json(region)
    } catch (error) {
      console.error('open-places region error:', error)
      res.status(500).json({ error: 'Failed to look up region' })
    }
  }
)

/**
 * @route GET /api/map/open-places/search?q=&lat=&lng=
 * @desc Name search across the open-data catalogue (extractor "Search" tab)
 */
router.get(
  '/open-places/search',
  authenticateToken,
  rateLimitMiddleware('open-places:search', 90, 60),
  [
    query('q').trim().isLength({ min: 2, max: 200 }).withMessage('q is required (2-200 chars)'),
    query('lat').optional().isFloat({ min: -90, max: 90 }),
    query('lng').optional().isFloat({ min: -180, max: 180 }),
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const lat = req.query.lat != null ? parseFloat(req.query.lat) : null
      const lng = req.query.lng != null ? parseFloat(req.query.lng) : null
      const limit = parseInt(req.query.limit, 10) || 8
      const results = await searchOpenPlaces(req.query.q, { lat, lng, limit })
      res.json({ results, count: results.length })
    } catch (error) {
      console.error('open-places search error:', error)
      res.status(500).json({ error: 'Failed to search open places' })
    }
  }
)

/**
 * @route POST /api/map/open-places/extract
 * @desc Catalogue places inside a bounding box (optionally clipped to a drawn
 *       polygon) that are not on the map yet. Capped at the per-run extract limit.
 */
router.post(
  '/open-places/extract',
  authenticateToken,
  rateLimitMiddleware('open-places:extract', 20, 60),
  [
    body('bbox.minLat').isFloat({ min: -90, max: 90 }),
    body('bbox.maxLat').isFloat({ min: -90, max: 90 }),
    body('bbox.minLng').isFloat({ min: -180, max: 180 }),
    body('bbox.maxLng').isFloat({ min: -180, max: 180 }),
    body('ring').optional({ nullable: true }).isArray({ min: 3, max: 2000 }),
    body('categories').optional({ nullable: true }).isArray({ max: 30 }),
    body('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const bbox = {
        minLat: parseFloat(req.body.bbox.minLat),
        maxLat: parseFloat(req.body.bbox.maxLat),
        minLng: parseFloat(req.body.bbox.minLng),
        maxLng: parseFloat(req.body.bbox.maxLng),
      }
      if (bbox.minLat >= bbox.maxLat || bbox.minLng >= bbox.maxLng) {
        return res.status(400).json({ error: 'INVALID_BBOX', message: 'Bounding box is empty' })
      }
      const areaKm2 = bboxAreaKm2(bbox)
      if (areaKm2 > EXTRACT_MAX_AREA_KM2) {
        return res.status(400).json({
          error: 'AREA_TOO_LARGE',
          message: `Area is about ${areaKm2.toFixed(1)} km². Zoom in or draw a smaller shape (max ${EXTRACT_MAX_AREA_KM2} km²).`,
          areaKm2,
          maxAreaKm2: EXTRACT_MAX_AREA_KM2,
        })
      }

      let ring = null
      if (req.body.ring != null) {
        ring = parseRing(req.body.ring)
        if (!ring) return res.status(400).json({ error: 'INVALID_RING', message: 'ring must be [[lng,lat],…]' })
      }
      const categories = Array.isArray(req.body.categories)
        ? req.body.categories.map((c) => String(c).trim()).filter(Boolean)
        : null
      const limit = Math.min(parseInt(req.body.limit, 10) || GRID_EXTRACT_MAX_PLACES, GRID_EXTRACT_MAX_PLACES)

      const stats = await openPlaceStats()
      if (!stats.available) {
        return res.status(503).json({
          error: 'OPEN_PLACES_EMPTY',
          message: 'The open place catalogue is not set up on this server yet.',
        })
      }

      const result = await extractOpenPlaces(bbox, { ring, categories, limit })
      res.json({ ...result, count: result.places.length, limit, areaKm2 })
    } catch (error) {
      console.error('open-places extract error:', error)
      res.status(500).json({ error: 'Failed to extract open places' })
    }
  }
)

const bboxChecks = [
  body('bbox.minLat').isFloat({ min: -90, max: 90 }),
  body('bbox.maxLat').isFloat({ min: -90, max: 90 }),
  body('bbox.minLng').isFloat({ min: -180, max: 180 }),
  body('bbox.maxLng').isFloat({ min: -180, max: 180 }),
]

/**
 * @route POST /api/map/open-places/ensure
 * @desc Make sure the catalogue holds this area. The first request for an area nobody
 *       imported starts a background download; the client repeats the call until
 *       the answer is "ready". Answers: ready | importing | failed | limit.
 */
router.post(
  '/open-places/ensure',
  authenticateToken,
  rateLimitMiddleware('open-places:ensure', 90, 60),
  bboxChecks,
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const bbox = {
        minLat: parseFloat(req.body.bbox.minLat),
        maxLat: parseFloat(req.body.bbox.maxLat),
        minLng: parseFloat(req.body.bbox.minLng),
        maxLng: parseFloat(req.body.bbox.maxLng),
      }
      if (bbox.minLat >= bbox.maxLat || bbox.minLng >= bbox.maxLng) {
        return res.status(400).json({ error: 'INVALID_BBOX', message: 'Bounding box is empty' })
      }
      if (bboxAreaKm2(bbox) > EXTRACT_MAX_AREA_KM2) {
        return res.status(400).json({ error: 'AREA_TOO_LARGE', message: `Area is larger than ${EXTRACT_MAX_AREA_KM2} km².` })
      }
      const stats = await openPlaceStats()
      if (!stats.available) {
        return res.status(503).json({ error: 'OPEN_PLACES_EMPTY', message: 'The open place catalogue is not set up on this server yet.' })
      }
      res.json(await ensureAreaImported(bbox, req.user.id))
    } catch (error) {
      console.error('open-places ensure error:', error)
      res.status(500).json({ error: 'Failed to prepare this area' })
    }
  }
)

function requireAdmin(req, res, next) {
  if (isPlaceDeleteAdmin(req.user)) return next()
  return res.status(403).json({ error: 'ADMIN_ONLY', message: 'Only an admin can add a whole region to the map.' })
}

/**
 * @route GET /api/map/open-places/auto-add
 * @desc Admin: progress / result of the current or last "extract & add region" job
 */
router.get(
  '/open-places/auto-add',
  authenticateToken,
  requireAdmin,
  rateLimitMiddleware('open-places:auto-add-status', 120, 60),
  (req, res) => {
    res.json({ job: getRegionJob(), maxAreaKm2: REGION_JOB_MAX_AREA_KM2, maxPlaces: REGION_JOB_MAX_PLACES })
  }
)

/**
 * @route POST /api/map/open-places/auto-add
 * @desc Admin: download a region's open data and add its places to the map in the background
 */
router.post(
  '/open-places/auto-add',
  authenticateToken,
  requireAdmin,
  rateLimitMiddleware('open-places:auto-add', 6, 60),
  [
    body('region').trim().isLength({ min: 2, max: 300 }).withMessage('region is required (2-300 chars)'),
    body('limit').optional().isInt({ min: 1, max: REGION_JOB_MAX_PLACES }),
    body('reviewOnly').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const job = await startRegionJob({
        region: req.body.region,
        limit: req.body.limit,
        reviewOnly: req.body.reviewOnly === true || req.body.reviewOnly === 'true',
        startedBy: req.user.id,
      })
      res.status(202).json({ job })
    } catch (error) {
      if (error instanceof RegionJobError) {
        return res.status(error.status).json({ error: error.code, message: error.message, job: getRegionJob() })
      }
      console.error('open-places auto-add error:', error)
      res.status(500).json({ error: 'Failed to start the region job' })
    }
  }
)

export default router
