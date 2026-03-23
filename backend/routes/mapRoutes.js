import express from 'express'
import { URL } from 'url'
import axios from 'axios'
import polyline from '@mapbox/polyline'
import { body, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { cacheMiddleware } from '../middleware/cache.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import prisma from '../config/database.js'
import { translateText, getLanguageFromAddress } from '../services/translateService.js'

const router = express.Router()

const ROUTE_SERVICE_URL = process.env.ROUTE_SERVICE_URL || 'https://umnaapp.in'
const ROUTE_BASE_URL = (process.env.ROUTE_SERVICE_URL || 'https://umnaapp.in').replace(/\/+$/, '') + '/map/route'
const OSRM_URL = (process.env.OSRM_URL || '').trim().replace(/\/+$/, '')
const OSRM_PUBLIC = 'https://router.project-osrm.org'
const SEARCH_URL = process.env.SEARCH_URL || 'https://umnaapp.in/map/nominatim/search?q='
const SEARCH_SIMPLE_URL = (process.env.SEARCH_SIMPLE_URL || 'https://umnaapp.in/search').trim().replace(/\/+$/, '')
const REVERSE_URL = process.env.REVERSE_URL || 'https://umnaapp.in/map/reverse'
const NOMINATIM_URL = process.env.NOMINATIM_URL || ''
const TILESERVER_URL = process.env.TILESERVER_URL || 'https://umnaapp.in'

const NOMINATIM_PUBLIC = 'https://nominatim.openstreetmap.org/reverse'

const SEARCH_SIMPLE_TIMEOUT = parseInt(process.env.SEARCH_SIMPLE_TIMEOUT, 10) || 20000
const SEARCH_SIMPLE_RETRIES = parseInt(process.env.SEARCH_SIMPLE_RETRIES, 10) || 3

/** Retry axios request on timeout or network errors */
async function axiosWithRetry(fn, { maxRetries = 3 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const isRetryable = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENETUNREACH'
      if (!isRetryable || attempt >= maxRetries) throw err
      const delay = attempt * 500
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

/** Reverse geocode lat/lon to get address (taluk, district, state) - returns address object or null */
async function reverseGeocode(lat, lon) {
  const urls = [
    (REVERSE_URL || '').trim().replace(/\/+$/, '') || 'https://umnaapp.in/map/reverse',
    (NOMINATIM_URL || '').trim().replace(/\/+$/, '') ? `${(NOMINATIM_URL || '').trim().replace(/\/+$/, '')}/reverse` : null,
    NOMINATIM_PUBLIC, // Fallback when umnaapp/NOMINATIM_URL fail (rate limit: 1 req/sec)
  ].filter(Boolean)
  for (const base of urls) {
    try {
      const res = await axios.get(base, {
        params: { lat: parseFloat(lat), lon: parseFloat(lon), format: 'json', addressdetails: 1 },
        headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
        timeout: 5000,
      })
      const addr = res.data?.address || null
      if (addr) return addr
    } catch {
      continue
    }
  }
  return null
}

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

      let routeData = null

      /** Fetch from OSRM-style API: /route/v1/{profile}/{coords} */
      const tryOsrm = async (baseUrl) => {
        const url = `${baseUrl.replace(/\/+$/, '')}/route/v1/${profile}/${coordinatesStr}`
        const res = await axios.get(url, {
          params: { overview: 'full', geometries: 'geojson' },
          timeout: 10000,
        })
        const r = res.data?.routes?.[0]
        if (r?.geometry?.coordinates?.length > 0) {
          return {
            distance: r.distance ?? 0,
            duration: r.duration ?? 0,
            geometry: r.geometry,
            steps: r.legs?.flatMap((leg) => leg.steps) ?? [],
          }
        }
        return null
      }

      /** Fetch from umnaapp-style API: /map/route/{profile}/{coords} */
      const tryUmnaapp = async () => {
        const url = `${ROUTE_BASE_URL}/${profile}/${coordinatesStr}`
        for (const geom of ['geojson', 'polyline']) {
          try {
            const res = await axios.get(url, {
              params: { overview: 'full', geometries: geom },
              timeout: 10000,
            })
            const data = res.data
            const route = data.routes?.[0] ?? (data.geometry ? { geometry: data.geometry, distance: data.distance, duration: data.duration, legs: data.legs } : null)
            if (geom === 'geojson' && route?.geometry?.coordinates?.length > 0) {
              return { distance: route.distance ?? 0, duration: route.duration ?? 0, geometry: route.geometry, steps: route.legs?.flatMap((l) => l.steps) ?? [] }
            }
            if (geom === 'polyline' && typeof route?.geometry === 'string') {
              const dec = polyline.decode(route.geometry, 5)
              const coordinates = dec.map(([lat, lng]) => [lng, lat])
              return { distance: route.distance ?? 0, duration: route.duration ?? 0, geometry: { type: 'LineString', coordinates }, steps: route.legs?.flatMap((l) => l.steps) ?? [] }
            }
          } catch (e) {
            if (geom === 'geojson') console.warn('Route umnaapp GeoJSON failed:', e.message)
          }
        }
        return null
      }

      // 1) umnaapp.in
      routeData = await tryUmnaapp()

      // 2) OSRM_URL (Docker/local)
      if (!routeData && OSRM_URL) {
        try {
          routeData = await tryOsrm(OSRM_URL)
          if (routeData) console.log('🗺️  Route from OSRM_URL')
        } catch (e) {
          console.warn('Route OSRM_URL failed:', e.message)
        }
      }

      // 3) Public OSRM demo
      if (!routeData) {
        try {
          routeData = await tryOsrm(OSRM_PUBLIC)
          if (routeData) console.log('🗺️  Route from OSRM public')
        } catch (e) {
          console.warn('Route OSRM public failed:', e.message)
        }
      }

      if (!routeData || !routeData.geometry?.coordinates?.length) {
        return res.status(400).json({ error: 'Route calculation failed', details: 'All route services unavailable (umnaapp, OSRM)' })
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
            polyline: JSON.stringify(routeData.geometry),
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
          const searchUrl = (SEARCH_URL || '').trim().replace(/\/+$/, '') || 'https://umnaapp.in/map/nominatim/search'
          const searchResponse = await axios.get(searchUrl, {
            params: { q: q.trim(), format: 'json', limit: safeLimit },
            headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0' },
            timeout: 10000,
          })
          const data = searchResponse.data
          const rawResults = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
          console.log('🔍 Search fetched:', { query: q, url: searchUrl, rawData: data, rawResults })

          // umnaapp.in/map/nominatim/search may return { name, lat, lon }; enrich with reverse geocode for taluk, district, state when address missing
          const toEnrich = Math.min(rawResults.length, 5)
          const reverseDelay = 1100 // Nominatim public: 1 req/sec
          const enriched = []
          for (let i = 0; i < toEnrich; i++) {
            const r = rawResults[i]
            const addr = await reverseGeocode(r.lat, r.lon ?? r.lng)
            enriched.push({ status: 'fulfilled', value: { r, addr } })
            if (i < toEnrich - 1) await new Promise((resolve) => setTimeout(resolve, reverseDelay))
          }

          results = rawResults.map((r, i) => {
            const address = r.address ?? (i < enriched.length && enriched[i].status === 'fulfilled' ? enriched[i].value.addr : null)
            return {
              placeId: r.place_id ?? r.id ?? r.osm_id ?? `${r.lat}-${r.lon ?? r.lng}`,
              displayName: r.display_name ?? r.name ?? r.formatted ?? '', // Nominatim: display_name; umnaapp: name
              lat: parseFloat(r.lat) || 0,
              lng: parseFloat(r.lon ?? r.lng) || 0,
              type: r.type,
              category: r.category,
              address,
              boundingBox: r.boundingbox,
            }
          })
          console.log('🔍 Search results (enriched):', results)
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
 * @route GET /api/map/search-simple
 * @desc Search places using umnaapp.in/search (simple API: name, lat, lon)
 * @access Private
 */
router.get(
  '/search-simple',
  authenticateToken,
  rateLimitMiddleware('search', 60, 60),
  [query('q').isString().notEmpty().withMessage('Search query required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      const parsed = new URL(req.originalUrl, `http://${req.get('host') || 'localhost'}`)
      const params = Object.fromEntries(parsed.searchParams)
      const q = (params.q || '').trim()
      const searchResponse = await axiosWithRetry(
        () =>
          axios.get(SEARCH_SIMPLE_URL, {
            params: { q },
            headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0' },
            timeout: SEARCH_SIMPLE_TIMEOUT,
            validateStatus: (status) => status === 200 || status === 404, // umnaapp.in/search returns 404 with valid JSON body
          }),
        { maxRetries: SEARCH_SIMPLE_RETRIES }
      )
      const raw = searchResponse.data
      const rawResults = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : []

      // API results
      const apiResults = rawResults.map((r, i) => ({
        placeId: r.place_id ?? r.id ?? r.osm_id ?? `api-${r.lat}-${r.lon ?? r.lng}-${i}`,
        displayName: r.display_name ?? r.name ?? r.formatted ?? '',
        lat: parseFloat(r.lat) || 0,
        lng: parseFloat(r.lon ?? r.lng) || 0,
        address: r.address ?? null,
      }))

      // User-added places from database (match name or category)
      let dbResults = []
      if (prisma.place && req.user?.id && q.length >= 2) {
        const searchTerm = q.trim()
        try {
          const dbPlaces = await prisma.place.findMany({
            where: {
              userId: req.user.id,
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { category: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, category: true, latitude: true, longitude: true },
          })
          dbResults = dbPlaces.map((p) => ({
            placeId: p.id,
            displayName: p.name,
            lat: p.latitude,
            lng: p.longitude,
            address: p.category ? { county: p.category } : null,
          }))
        } catch (dbErr) {
          console.warn('DB places search failed:', dbErr.message)
        }
      }

      // Merge: DB places first (user's own), then API results, dedupe by coords
      const seen = new Set()
      const merged = []
      for (const r of [...dbResults, ...apiResults]) {
        const key = `${r.lat.toFixed(5)}-${r.lng.toFixed(5)}`
        if (!seen.has(key)) {
          seen.add(key)
          merged.push(r)
        }
      }

      res.json({ query: q, results: merged, count: merged.length })
    } catch (error) {
      console.error('Search simple error:', error.message)
      res.status(503).json({
        error: true,
        message: 'Search service temporarily unavailable',
        query: req.query.q,
        results: [],
        count: 0,
      })
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

      const targetLang = getLanguageFromAddress(result.address || {})

      const address = {
        placeId: result.place_id,
        displayName: result.display_name ?? result.name ?? '',
        lat: parseFloat(result.lat) || parseFloat(lat),
        lng: parseFloat(result.lon ?? result.lng) || parseFloat(lng),
        address: result.address,
        boundingBox: result.boundingbox,
        targetLang, // For Add Place auto-translation (e.g. 'kn', 'ta', 'hi')
      }

      res.json(address)
    } catch (error) {
      console.error('Reverse geocode error:', error.message)
      res.status(500).json({ error: 'Failed to reverse geocode', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/translate
 * @desc Translate English text to local language (Atozas Translate or fallback)
 * @access Private
 */
router.post(
  '/translate',
  authenticateToken,
  rateLimitMiddleware('translate', 60, 60),
  [
    body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Text required (1-500 chars)'),
    body('targetLang').trim().isLength({ min: 2, max: 10 }).withMessage('Target language code required (e.g. kn, ta, hi)'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { text, targetLang } = req.body
      const translated = await translateText(text.trim(), targetLang.trim().toLowerCase())

      res.json({ translatedText: translated, targetLang: targetLang.trim().toLowerCase() })
    } catch (error) {
      console.error('Translate error:', error.message)
      res.status(500).json({ error: 'Translation failed', message: error.message })
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
    body('place_name_en').trim().isLength({ min: 1, max: 200 }).withMessage('Place name (English) required (1-200 chars)'),
    body('place_name_local').optional().trim().isLength({ max: 200 }).withMessage('Local name max 200 chars'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category required (1-50 chars)'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('zoomLevel').optional().isFloat({ min: 0, max: 22 }).withMessage('Zoom level 0-22'),
    body('source').optional().isIn(['contribution', 'saved']).withMessage('Source must be contribution or saved'),
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

      const { place_name_en, place_name_local, category, latitude, longitude, zoomLevel = 15, source = 'contribution' } = req.body
      const userId = req.user.id
      const userName = req.user.name || null
      const userEmail = req.user.email || null
      const nameEn = (place_name_en || '').trim()
      const nameLocal = (place_name_local || '').trim() || null

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
          name: nameEn, // legacy field = place_name_en
          placeNameEn: nameEn,
          placeNameLocal: nameLocal,
          category,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          zoomLevel: parseFloat(zoomLevel),
          userId,
          userName,
          userEmail,
          source: source === 'saved' ? 'saved' : 'contribution',
        },
      })

      res.status(201).json({
        id: place.id,
        name: place.placeNameEn ?? place.name,
        place_name_en: place.placeNameEn ?? place.name,
        place_name_local: place.placeNameLocal,
        category: place.category,
        latitude: place.latitude,
        longitude: place.longitude,
        zoomLevel: place.zoomLevel,
        source: place.source ?? 'contribution',
        userId: place.userId,
        user_name: place.userName,
        user_email: place.userEmail,
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

      // Only return places belonging to this user (filter by userId; each user sees only their own)
      const places = await prisma.place.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          placeNameEn: true,
          placeNameLocal: true,
          category: true,
          latitude: true,
          longitude: true,
          zoomLevel: true,
          source: true,
          userId: true,
          userName: true,
          userEmail: true,
          createdAt: true,
        },
      })
      // Normalize for API: name = place_name_en for backward compat
      const normalized = places.map((p) => ({
        ...p,
        name: p.placeNameEn ?? p.name,
        place_name_en: p.placeNameEn ?? p.name,
        place_name_local: p.placeNameLocal,
        user_name: p.userName,
        user_email: p.userEmail,
      }))
      res.json({ places: normalized })
    } catch (error) {
      console.error('List places error:', error)
      res.status(500).json({ error: 'Failed to fetch places', message: error.message })
    }
  }
)

/**
 * @route DELETE /api/map/places/:id
 * @desc Delete a place owned by the current user
 * @access Private
 */
router.delete(
  '/places/:id',
  authenticateToken,
  rateLimitMiddleware('places:delete', 30, 60),
  async (req, res) => {
    try {
      if (!prisma.place) {
        return res.status(503).json({ error: 'Place model not available' })
      }

      const { id } = req.params
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({ error: 'Place ID required' })
      }

      // Verify the place belongs to the authenticated user before deleting
      const place = await prisma.place.findFirst({
        where: { id: id.trim(), userId: req.user.id },
        select: { id: true },
      })

      if (!place) {
        return res.status(404).json({ error: 'Place not found or not authorized' })
      }

      await prisma.place.delete({ where: { id: id.trim() } })

      res.json({ success: true, id: id.trim() })
    } catch (error) {
      console.error('Delete place error:', error)
      res.status(500).json({ error: 'Failed to delete place', message: error.message })
    }
  }
)

export default router

