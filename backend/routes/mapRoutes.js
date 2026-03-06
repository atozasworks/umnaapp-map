import express from 'express'
import axios from 'axios'
import { body, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { cacheMiddleware } from '../middleware/cache.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import prisma from '../config/database.js'

const router = express.Router()

const ROUTE_SERVICE_URL = process.env.ROUTE_SERVICE_URL || 'https://umnaapp.in'
const SEARCH_URL = process.env.SEARCH_URL || 'https://umnaapp.in/search'
const REVERSE_URL = process.env.REVERSE_URL || 'https://umnaapp.in/map/reverse'
const TILESERVER_URL = process.env.TILESERVER_URL || 'https://umnaapp.in'

/**
 * @route GET /api/map/tiles/:z/:x/:y.png
 * @desc Proxy tile requests from umnaapp.in only
 * @access Public
 */
router.get('/tiles/:z/:x/:y.png', async (req, res) => {
  try {
    const { z, x, y } = req.params
    const tileUrls = [
      `${TILESERVER_URL}/map/tiles/${z}/${x}/${y}.png`,
      `${TILESERVER_URL}/tiles/${z}/${x}/${y}.png`,
    ]

    for (const tileUrl of tileUrls) {
      try {
        const tileResponse = await axios.get(tileUrl, {
          responseType: 'stream',
          timeout: 15000,
          headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0' },
          validateStatus: (status) => status === 200,
        })

        if (tileResponse.status === 200) {
          res.setHeader('Content-Type', tileResponse.headers['content-type'] || 'image/png')
          res.setHeader('Cache-Control', tileResponse.headers['cache-control'] || 'public, max-age=86400')
          tileResponse.data.pipe(res)
          return
        }
      } catch (err) {
        continue
      }
    }

    res.status(502).send('Failed to fetch tile from umnaapp.in')
  } catch (error) {
    console.error('Tile proxy error:', error.message)
    res.status(502).send('Failed to fetch tile from umnaapp.in')
  }
})

/**
 * @route GET /api/map/route
 * @desc Get route between two or more points using UMNAAPP routing service
 * @access Private
 * @see https://umnaapp.in/map/route/{profile}/{lon1,lat1;lon2,lat2}?overview=full&geometries=geojson
 */
router.get(
  '/route',
  authenticateToken,
  rateLimitMiddleware('route', 30, 60), // 30 requests per minute
  [
    query('start').isString().withMessage('Start coordinates required (lat,lng)'),
    query('end').isString().withMessage('End coordinates required (lat,lng)'),
    query('profile').optional().isIn(['driving', 'walking', 'cycling']).withMessage('Invalid profile'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { start, end, profile = 'driving', waypoints } = req.query

      // Validate coordinates (frontend sends lat,lng)
      const startCoords = start.split(',').map(Number)
      const endCoords = end.split(',').map(Number)

      if (startCoords.length !== 2 || endCoords.length !== 2) {
        return res.status(400).json({ error: 'Invalid coordinate format' })
      }

      // Build coordinates string: lon,lat;lon,lat (UMNAAPP format)
      let coordinatesStr = `${startCoords[1]},${startCoords[0]}` // lng,lat
      if (waypoints) {
        const waypointCoords = waypoints.split(';').map((wp) => {
          const [lat, lng] = wp.split(',').map(Number)
          return `${lng},${lat}`
        })
        coordinatesStr += `;${waypointCoords.join(';')}`
      }
      coordinatesStr += `;${endCoords[1]},${endCoords[0]}`

      const routeUrl = `${ROUTE_SERVICE_URL}/map/route/${profile}/${coordinatesStr}`
      console.log(`🗺️  Route request: ${routeUrl}`)

      const routeResponse = await axios.get(routeUrl, {
        params: {
          overview: 'full',
          geometries: 'geojson',
        },
        timeout: 15000,
      })

      const data = routeResponse.data

      // Support OSRM-style (routes array) or flat response (direct geometry)
      let route
      if (data.routes && data.routes[0]) {
        route = data.routes[0]
      } else if (data.geometry) {
        route = data
      } else {
        console.error('Unexpected route response format:', data)
        return res.status(400).json({ error: 'Route calculation failed', details: 'Invalid response format' })
      }

      if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
        return res.status(400).json({ error: 'Route calculation failed', details: 'No route geometry' })
      }

      const routeData = {
        distance: route.distance ?? 0,
        duration: route.duration ?? 0,
        geometry: route.geometry,
        steps: route.legs?.flatMap((leg) => leg.steps) ?? [],
      }

      // Optionally save route to database
      if (req.query.save === 'true') {
        await prisma.route.create({
          data: {
            userId: req.user.id,
            startLat: startCoords[0],
            startLng: startCoords[1],
            endLat: endCoords[0],
            endLng: endCoords[1],
            waypoints: waypoints
              ? waypoints.split(';').map((wp) => {
                  const [lat, lng] = wp.split(',').map(Number)
                  return { lat, lng }
                })
              : null,
            distance: routeData.distance,
            duration: Math.round(routeData.duration),
            polyline: JSON.stringify(route.geometry),
            status: 'planned',
          },
        })
      }

      res.json(routeData)
    } catch (error) {
      console.error('Route error:', error?.response?.data ?? error.message)
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Route service error',
          message: error.response.data?.message ?? error.response.data?.error ?? error.message,
        })
      }
      res.status(500).json({ error: 'Failed to calculate route', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/search
 * @desc Search places using umnaapp.in search API
 * @access Private
 */
router.get(
  '/search',
  authenticateToken,
  rateLimitMiddleware('search', 60, 60), // 60 requests per minute
  cacheMiddleware(300), // Cache for 5 minutes (popular queries)
  [
    query('q').isString().notEmpty().withMessage('Search query required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { q, limit = 10 } = req.query
      const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 50)
      let results = []

      if (SEARCH_URL) {
        try {
          const searchUrl = (SEARCH_URL || '').trim().replace(/\/+$/, '') || 'https://umnaapp.in/search'
          const searchResponse = await axios.get(searchUrl, {
            params: { q, limit: safeLimit },
            headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0' },
            timeout: 10000,
          })
          const data = searchResponse.data
          const rawResults = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
          results = rawResults.map((r) => ({
            placeId: r.place_id ?? r.id ?? r.osm_id ?? `${r.lat}-${r.lon}`,
            displayName: r.display_name ?? r.name ?? r.formatted ?? '',
            lat: parseFloat(r.lat) || 0,
            lng: parseFloat(r.lon ?? r.lng) || 0,
            type: r.type,
            category: r.category,
            address: r.address,
            boundingBox: r.boundingbox,
          }))
        } catch (extErr) {
          console.warn('Search failed:', extErr.message)
        }
      }

      res.json({ query: q, results, count: results.length })
    } catch (error) {
      console.error('Search error:', error.message)
      res.json({ query: req.query.q, results: [], count: 0 })
    }
  }
)

/**
 * @route GET /api/map/reverse
 * @desc Reverse geocode coordinates to address using umnaapp.in/map/reverse
 * @access Private
 */
router.get(
  '/reverse',
  authenticateToken,
  rateLimitMiddleware('reverse', 60, 60), // 60 requests per minute
  cacheMiddleware(600), // Cache for 10 minutes
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { lat, lng } = req.query
      const reverseUrl = (REVERSE_URL || '').trim().replace(/\/+$/, '') || 'https://umnaapp.in/map/reverse'

      const reverseResponse = await axios.get(reverseUrl, {
        params: { lat: parseFloat(lat), lon: parseFloat(lng), format: 'json', addressdetails: 1 },
        headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0' },
        timeout: 10000,
      })

      const result = reverseResponse.data
      if (!result || result.error) {
        return res.status(404).json({ error: 'Location not found' })
      }

      const address = {
        placeId: result.place_id,
        displayName: result.display_name ?? result.name ?? '',
        lat: parseFloat(result.lat) || parseFloat(lat),
        lng: parseFloat(result.lon ?? result.lng) || parseFloat(lng),
        address: result.address,
        boundingBox: result.boundingbox,
      }

      res.json(address)
    } catch (error) {
      console.error('Reverse geocode error:', error.message)
      res.status(500).json({ error: 'Failed to reverse geocode', message: error.message })
    }
  }
)

const PLACE_CATEGORIES = [
  'Restaurant',
  'Hospital',
  'Hotel',
  'Parking',
  'Shop',
  'Grocery Store',
  'School',
  'Temple',
  'Bank',
  'Post Office',
  'Bus Stop',
  'Police Station',
  'Petrol Pump',
  'Tourist Place',
  'Transit',
  'Museum',
  'Pharmacy',
  'ATM',
  'Cinema',
  'Gym',
  'Salon',
  'Other',
]

/**
 * @route POST /api/map/places
 * @desc Save a new place
 * @access Private
 */
router.post(
  '/places',
  authenticateToken,
  rateLimitMiddleware('places:create', 30, 60),
  [
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Place name required (1-200 chars)'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category required (1-50 chars)'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('zoomLevel').optional().isFloat({ min: 0, max: 22 }).withMessage('Zoom level 0-22'),
  ],
  async (req, res) => {
    try {
      if (!prisma.place) {
        return res.status(503).json({
          error: 'Place model not available',
          message: 'Run: cd backend && npx prisma generate (stop the server first, then restart)',
        })
      }

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, category, latitude, longitude, zoomLevel = 15 } = req.body
      const userId = req.user.id

      // Prevent duplicates: same user, same coordinates (within ~11m at equator)
      const duplicate = await prisma.place.findFirst({
        where: {
          userId,
          latitude: { gte: latitude - 0.0001, lte: latitude + 0.0001 },
          longitude: { gte: longitude - 0.0001, lte: longitude + 0.0001 },
        },
      })

      if (duplicate) {
        return res.status(409).json({
          error: 'Duplicate place',
          message: 'A place already exists at this location.',
        })
      }

      const place = await prisma.place.create({
        data: {
          name: name.trim(),
          category,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          zoomLevel: parseFloat(zoomLevel),
          userId,
        },
      })

      res.status(201).json({
        id: place.id,
        name: place.name,
        category: place.category,
        latitude: place.latitude,
        longitude: place.longitude,
        zoomLevel: place.zoomLevel,
        createdAt: place.createdAt,
      })
    } catch (error) {
      console.error('Save place error:', error)
      res.status(500).json({ error: 'Failed to save place', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/places
 * @desc List places for the current user
 * @access Private
 */
router.get(
  '/places',
  authenticateToken,
  rateLimitMiddleware('places:list', 60, 60),
  async (req, res) => {
    try {
      if (!prisma.place) {
        return res.status(503).json({
          error: 'Place model not available',
          message: 'Run: cd backend && npx prisma generate (stop the server first, then restart)',
        })
      }

      const places = await prisma.place.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          category: true,
          latitude: true,
          longitude: true,
          zoomLevel: true,
          createdAt: true,
        },
      })
      res.json({ places })
    } catch (error) {
      console.error('List places error:', error)
      res.status(500).json({ error: 'Failed to fetch places', message: error.message })
    }
  }
)

export default router

