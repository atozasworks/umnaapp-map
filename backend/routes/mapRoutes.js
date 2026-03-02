import express from 'express'
import axios from 'axios'
import { body, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { cacheMiddleware } from '../middleware/cache.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import prisma from '../config/database.js'

const router = express.Router()

const OSRM_URL = process.env.OSRM_URL || 'http://localhost:5000'
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'http://localhost:8081'
const TILESERVER_URL = process.env.TILESERVER_URL || 'https://umnaapp.in'

const NOMINATIM_FALLBACK_URLS = [
  'https://nominatim.openstreetmap.org',
  'http://localhost:8081',
  'http://nominatim:8080',
]

const getNominatimBaseUrls = () => {
  const configured = (NOMINATIM_URL || '').trim().replace(/\/+$/, '')
  const urls = [configured, ...NOMINATIM_FALLBACK_URLS]
    .filter(Boolean)
    .map((url) => url.replace(/\/+$/, ''))

  return [...new Set(urls)]
}

const requestNominatimWithFallback = async (endpoint, requestConfig = {}) => {
  const baseUrls = getNominatimBaseUrls()
  const errors = []

  for (const baseUrl of baseUrls) {
    const fullUrl = `${baseUrl}${endpoint}`
    try {
      return await axios.get(fullUrl, requestConfig)
    } catch (error) {
      const statusCode = error?.response?.status
      errors.push({
        url: fullUrl,
        status: statusCode,
        message: error.message,
      })

      const isRetriableStatus = !statusCode || [404, 429, 500, 502, 503, 504].includes(statusCode)
      if (!isRetriableStatus) {
        break
      }
    }
  }

  const details = errors.map((entry) => `${entry.url} -> ${entry.status || 'NO_RESPONSE'}`).join(' | ')
  throw new Error(`All Nominatim upstreams failed: ${details}`)
}

/**
 * @route GET /api/map/tiles/:z/:x/:y.png
 * @desc Proxy UMNAAPP tile requests to avoid browser CORS restrictions
 * @access Public
 */
router.get('/tiles/:z/:x/:y.png', async (req, res) => {
  try {
    const { z, x, y } = req.params
    const tileResponse = await axios.get(`${TILESERVER_URL}/tiles/${z}/${x}/${y}.png`, {
      responseType: 'stream',
      timeout: 15000,
      validateStatus: (status) => status >= 200 && status < 500,
    })

    if (tileResponse.status !== 200) {
      return res.status(tileResponse.status).send('Tile not available')
    }

    res.setHeader('Content-Type', tileResponse.headers['content-type'] || 'image/png')
    res.setHeader('Cache-Control', tileResponse.headers['cache-control'] || 'public, max-age=86400')
    tileResponse.data.pipe(res)
  } catch (error) {
    console.error('Tile proxy error:', error.message)
    res.status(502).send('Failed to fetch tile from upstream service')
  }
})

/**
 * @route GET /api/map/route
 * @desc Get route between two or more points using OSRM
 * @access Private
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

      // Validate coordinates
      const startCoords = start.split(',').map(Number)
      const endCoords = end.split(',').map(Number)

      if (startCoords.length !== 2 || endCoords.length !== 2) {
        return res.status(400).json({ error: 'Invalid coordinate format' })
      }

      // Build coordinates string for OSRM
      let coordinates = `${startCoords[1]},${startCoords[0]}` // OSRM uses lng,lat
      if (waypoints) {
        const waypointCoords = waypoints.split(';').map(wp => {
          const [lat, lng] = wp.split(',').map(Number)
          return `${lng},${lat}`
        })
        coordinates += `;${waypointCoords.join(';')}`
      }
      coordinates += `;${endCoords[1]},${endCoords[0]}`

      // Call OSRM
      const osrmResponse = await axios.get(`${OSRM_URL}/route/v1/${profile}/${coordinates}`, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true,
          alternatives: false,
        },
        timeout: 10000,
      })

      if (osrmResponse.data.code !== 'Ok') {
        return res.status(400).json({ error: 'Route calculation failed', details: osrmResponse.data })
      }

      const route = osrmResponse.data.routes[0]
      const routeData = {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry,
        steps: route.legs.flatMap(leg => leg.steps),
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
            waypoints: waypoints ? waypoints.split(';').map(wp => {
              const [lat, lng] = wp.split(',').map(Number)
              return { lat, lng }
            }) : null,
            distance: route.distance,
            duration: Math.round(route.duration),
            polyline: JSON.stringify(route.geometry),
            status: 'planned',
          },
        })
      }

      res.json(routeData)
    } catch (error) {
      console.error('Route error:', error)
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'OSRM service error',
          message: error.response.data?.message || error.message,
        })
      }
      res.status(500).json({ error: 'Failed to calculate route', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/search
 * @desc Search for places using Nominatim
 * @access Private
 */
router.get(
  '/search',
  authenticateToken,
  rateLimitMiddleware('search', 60, 60), // 60 requests per minute
  cacheMiddleware(300), // Cache for 5 minutes
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

      const { q, limit = 10, viewbox } = req.query

      const nominatimParams = {
        q,
        format: 'json',
        limit: parseInt(limit),
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
      }

      // Add viewbox if provided (format: minLng,minLat,maxLng,maxLat)
      if (viewbox) {
        nominatimParams.viewbox = viewbox
        nominatimParams.bounded = 1
      }

      const nominatimResponse = await requestNominatimWithFallback('/search', {
        params: nominatimParams,
        headers: {
          'User-Agent': 'UMNAAPP-Map-Platform/1.0',
        },
        timeout: 10000,
      })

      const results = nominatimResponse.data.map(result => ({
        placeId: result.place_id,
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type,
        category: result.category,
        address: result.address,
        boundingBox: result.boundingbox,
      }))

      res.json({ results, count: results.length })
    } catch (error) {
      console.error('Search error:', error)
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Nominatim service error',
          message: error.response.data?.message || error.message,
        })
      }
      res.status(500).json({ error: 'Failed to search places', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/reverse
 * @desc Reverse geocode coordinates to address using Nominatim
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

      const nominatimResponse = await requestNominatimWithFallback('/reverse', {
        params: {
          lat: parseFloat(lat),
          lon: parseFloat(lng),
          format: 'json',
          addressdetails: 1,
          extratags: 1,
          namedetails: 1,
        },
        headers: {
          'User-Agent': 'UMNAAPP-Map-Platform/1.0',
        },
        timeout: 10000,
      })

      if (!nominatimResponse.data || nominatimResponse.data.error) {
        return res.status(404).json({ error: 'Location not found' })
      }

      const result = nominatimResponse.data
      const address = {
        placeId: result.place_id,
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.address,
        boundingBox: result.boundingbox,
      }

      res.json(address)
    } catch (error) {
      console.error('Reverse geocode error:', error)
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Nominatim service error',
          message: error.response.data?.message || error.message,
        })
      }
      res.status(500).json({ error: 'Failed to reverse geocode', message: error.message })
    }
  }
)

export default router

