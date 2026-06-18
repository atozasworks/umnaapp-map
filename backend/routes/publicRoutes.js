/**
 * Public Map Platform API (UMNAAPP Maps).
 *
 * These endpoints expose ONLY approved place data from the shared `Place` table
 * and require NO authentication, so external projects, embedded iframes, the
 * JavaScript SDK, and mobile apps can consume the same live data the main app
 * uses. Private endpoints (admin, users, notifications, payments, auth) are
 * untouched and stay protected.
 *
 * Cross-origin: permissive CORS (any origin) is intentional here because this is
 * a public read-only data API meant to be embedded on third-party sites. No
 * cookies/credentials are used.
 *
 * Performance: per-IP rate limiting + Redis response caching + pagination.
 */

import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { query, param, validationResult } from 'express-validator'
import { cacheMiddleware } from '../middleware/cache.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import {
  listPublicPlaces,
  nearbyPublicPlaces,
  publicCategories,
  getPublicPlaceById,
} from '../services/publicPlaceQuery.js'
import { publicPlaceSearch } from '../services/unifiedPlaceQuery.js'
import { buildDirectRoute } from '../utils/routeHelpers.js'
import { osrmProfileFor } from '../utils/travelModeRouting.js'

const router = express.Router()

/** Public, credential-less CORS for every route in this file. */
const publicCors = cors({
  origin: true,
  methods: ['GET', 'OPTIONS'],
  credentials: false,
  maxAge: 86400,
})
router.use(publicCors)
router.options('*', publicCors)

const ROUTE_SERVICE_URL = (process.env.ROUTE_SERVICE_URL || 'https://umnaapp.in').replace(/\/+$/, '')
const OSRM_URL = (process.env.OSRM_URL || '').trim().replace(/\/+$/, '')
const OSRM_PUBLIC = 'https://router.project-osrm.org'
const TILESERVER_URL = (process.env.TILESERVER_URL || 'https://umnaapp.in').replace(/\/+$/, '')

function handleValidation(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid request', details: errors.array() })
    return false
  }
  return true
}

function parseCategories(raw) {
  return String(raw || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

/**
 * @route GET /api/public/places
 * @desc Approved places (bbox + category filters, paginated)
 * @access Public
 */
router.get(
  '/places',
  rateLimitMiddleware('public:places', 120, 60),
  [
    query('categories').optional().isString().isLength({ max: 500 }),
    query('q').optional().isString().isLength({ max: 200 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('offset').optional().isInt({ min: 0 }),
    query('minLat').optional().isFloat({ min: -90, max: 90 }),
    query('maxLat').optional().isFloat({ min: -90, max: 90 }),
    query('minLng').optional().isFloat({ min: -180, max: 180 }),
    query('maxLng').optional().isFloat({ min: -180, max: 180 }),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return
    try {
      const result = await listPublicPlaces({
        categories: parseCategories(req.query.categories),
        q: req.query.q,
        minLat: req.query.minLat != null ? parseFloat(req.query.minLat) : null,
        maxLat: req.query.maxLat != null ? parseFloat(req.query.maxLat) : null,
        minLng: req.query.minLng != null ? parseFloat(req.query.minLng) : null,
        maxLng: req.query.maxLng != null ? parseFloat(req.query.maxLng) : null,
        limit: req.query.limit,
        offset: req.query.offset,
      })
      res.json({
        places: result.places,
        count: result.places.length,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.places.length < result.total,
      })
    } catch (error) {
      console.error('[public] places error:', error)
      res.status(500).json({ error: 'Failed to fetch places' })
    }
  }
)

/**
 * @route GET /api/public/search?q=
 * @desc Text search via umnaapp.in/search + approved local places (proximity-ranked when lat/lng given)
 * @access Public
 */
router.get(
  '/search',
  rateLimitMiddleware('public:search', 120, 60),
  cacheMiddleware(120),
  [
    query('q').isString().trim().isLength({ min: 2, max: 200 }).withMessage('q must be 2-200 chars'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('lat').optional().isFloat({ min: -90, max: 90 }),
    query('lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return
    try {
      const q = String(req.query.q || '').trim()
      const limit = Math.min(parseInt(req.query.limit, 10) || 15, 15)
      const lat = req.query.lat != null ? parseFloat(req.query.lat) : null
      const lng = req.query.lng != null ? parseFloat(req.query.lng) : null

      const radiusKm = req.query.radiusKm != null ? parseFloat(req.query.radiusKm) : null

      const { results, providers, upstreamError } = await publicPlaceSearch(q, {
        limit,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
        radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
      })

      if (results.length === 0 && upstreamError) {
        return res.status(200).json({
          query: q,
          results: [],
          count: 0,
          upstreamUnavailable: true,
          message: 'Geocoding service temporarily unavailable',
        })
      }

      res.json({
        query: q,
        results,
        count: results.length,
        ...(providers.length ? { provider: providers.join('+'), providers } : {}),
        ...(upstreamError ? { upstreamUnavailable: true } : {}),
      })
    } catch (error) {
      console.error('[public] search error:', error)
      res.status(500).json({ error: 'Search failed' })
    }
  }
)

/**
 * @route GET /api/public/nearby?lat=&lng=&radius=
 * @desc Approved places near a point, sorted by distance
 * @access Public
 */
router.get(
  '/nearby',
  rateLimitMiddleware('public:nearby', 120, 60),
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('lat required'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('lng required'),
    query('radius').optional().isInt({ min: 50, max: 50000 }),
    query('category').optional().isString().isLength({ max: 80 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return
    try {
      const { results, count } = await nearbyPublicPlaces({
        lat: parseFloat(req.query.lat),
        lng: parseFloat(req.query.lng),
        radiusMeters: req.query.radius != null ? parseInt(req.query.radius, 10) : 2000,
        category: req.query.category ? String(req.query.category).trim() : undefined,
        limit: req.query.limit,
      })
      res.json({ results, count })
    } catch (error) {
      console.error('[public] nearby error:', error)
      res.status(500).json({ error: 'Failed to fetch nearby places' })
    }
  }
)

/**
 * @route GET /api/public/categories
 * @desc Distinct approved categories with counts
 * @access Public
 */
router.get(
  '/categories',
  rateLimitMiddleware('public:categories', 120, 60),
  cacheMiddleware(300),
  async (req, res) => {
    try {
      const result = await publicCategories()
      res.json(result)
    } catch (error) {
      console.error('[public] categories error:', error)
      res.status(500).json({ error: 'Failed to fetch categories' })
    }
  }
)

/**
 * @route GET /api/public/route?start=lat,lng&end=lat,lng&profile=
 * @desc Public routing between two points (OSRM with safe fallback)
 * @access Public
 */
router.get(
  '/route',
  rateLimitMiddleware('public:route', 60, 60),
  [
    query('start').isString().withMessage('start=lat,lng required'),
    query('end').isString().withMessage('end=lat,lng required'),
    query('profile').optional().isIn(['driving', 'walking', 'cycling', 'bus', 'two_wheeler']),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return
    try {
      const { start, end, profile = 'driving' } = req.query
      const [sLat, sLng] = String(start).split(',').map(Number)
      const [eLat, eLng] = String(end).split(',').map(Number)
      if (![sLat, sLng, eLat, eLng].every(Number.isFinite)) {
        return res.status(400).json({ error: 'Invalid coordinates' })
      }

      const osrmProfile = osrmProfileFor(profile) || 'driving'
      const coords = `${sLng},${sLat};${eLng},${eLat}`

      const tryOsrm = async (base) => {
        const url = `${base}/route/v1/${osrmProfile}/${coords}`
        const r = await axios.get(url, {
          params: { overview: 'full', geometries: 'geojson', steps: 'false' },
          timeout: 9000,
        })
        const ct = String(r.headers?.['content-type'] || '')
        if (ct.includes('text/html') || typeof r.data === 'string') throw new Error('non-OSRM')
        const route = r.data?.routes?.[0]
        if (!route?.geometry?.coordinates?.length) throw new Error('no route')
        return {
          distance: route.distance ?? 0,
          duration: route.duration ?? 0,
          geometry: route.geometry,
        }
      }

      let routeData = null
      for (const base of [ROUTE_SERVICE_URL, OSRM_URL, OSRM_PUBLIC].filter(Boolean)) {
        try {
          routeData = await tryOsrm(base)
          if (routeData) break
        } catch {
          /* try next provider */
        }
      }

      if (!routeData) {
        routeData = buildDirectRoute(sLat, sLng, eLat, eLng, profile)
      }

      res.json({
        profile,
        distance: routeData.distance,
        duration: routeData.duration,
        geometry: routeData.geometry,
      })
    } catch (error) {
      console.error('[public] route error:', error.message)
      res.status(500).json({ error: 'Failed to calculate route' })
    }
  }
)

/**
 * @route GET /api/public/config
 * @desc Client configuration for the viewer / SDK (tiles, defaults, attribution)
 * @access Public
 */
router.get('/config', rateLimitMiddleware('public:config', 120, 60), cacheMiddleware(300), (req, res) => {
  res.json({
    name: 'UMNAAPP Maps',
    tiles: {
      // Same-origin proxy keeps CORS simple for embedders; raw host as fallback.
      url: '/api/map/tiles/{z}/{x}/{y}.png',
      fallbackUrl: `${TILESERVER_URL}/tiles/{z}/{x}/{y}.png`,
      maxZoom: 19,
      attribution: '© UMNAAPP · OpenStreetMap contributors',
    },
    defaultCenter: {
      lat: parseFloat(process.env.PUBLIC_MAP_DEFAULT_LAT) || 12.9716,
      lng: parseFloat(process.env.PUBLIC_MAP_DEFAULT_LNG) || 77.5946,
    },
    defaultZoom: parseFloat(process.env.PUBLIC_MAP_DEFAULT_ZOOM) || 12,
    realtime: {
      namespace: '/public-maps',
      events: ['place:created', 'place:updated', 'place:approved', 'place:deleted'],
    },
    endpoints: {
      places: '/api/public/places',
      search: '/api/public/search',
      nearby: '/api/public/nearby',
      categories: '/api/public/categories',
      place: '/api/public/place/:id',
      route: '/api/public/route',
    },
  })
})

/**
 * @route GET /api/public/place/:id
 * @desc Single approved place by id
 * @access Public
 */
router.get(
  '/place/:id',
  rateLimitMiddleware('public:place', 120, 60),
  [param('id').isString().isLength({ min: 1, max: 100 })],
  async (req, res) => {
    if (!handleValidation(req, res)) return
    try {
      const place = await getPublicPlaceById(req.params.id)
      if (!place) return res.status(404).json({ error: 'Place not found' })
      res.json({ place })
    } catch (error) {
      console.error('[public] place detail error:', error)
      res.status(500).json({ error: 'Failed to fetch place' })
    }
  }
)

export default router
