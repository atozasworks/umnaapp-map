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
import {
  autoApproveExpiredPendingPlaces,
  placePublicVisibilityOr,
  isPlaceVisibleToUser,
  pendingAutoApproveAt,
} from '../services/placeApproval.js'

const router = express.Router()

function attachApprovalMeta(p) {
  if (!p) return p
  const st = p.approvalStatus ?? 'approved'
  const base = { ...p, approvalStatus: st, approvedAt: p.approvedAt ?? null }
  if (st === 'pending' && p.createdAt) {
    base.autoApproveAt = pendingAutoApproveAt(p.createdAt).toISOString()
  }
  return base
}

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
async function reverseGeocodeResult(lat, lon) {
  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) return null

  const urls = [
    (REVERSE_URL || '').trim().replace(/\/+$/, '') || 'https://umnaapp.in/map/reverse',
    (NOMINATIM_URL || '').trim().replace(/\/+$/, '') ? `${(NOMINATIM_URL || '').trim().replace(/\/+$/, '')}/reverse` : null,
    NOMINATIM_PUBLIC,
  ].filter(Boolean)

  for (const base of urls) {
    const paramVariants = [
      { lat: latNum, lon: lonNum, format: 'json', addressdetails: 1 },
      { lat: latNum, lng: lonNum, format: 'json', addressdetails: 1 },
    ]

    for (const params of paramVariants) {
      try {
        const res = await axiosWithRetry(
          () =>
            axios.get(base, {
              params,
              headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
              timeout: 7000,
            }),
          { maxRetries: 2 }
        )

        const result = res.data
        if (result && !result.error && (result.address || result.display_name || result.name)) {
          return result
        }
      } catch {
        continue
      }
    }
  }

  return null
}

async function reverseGeocode(lat, lon) {
  const result = await reverseGeocodeResult(lat, lon)
  return result?.address || null
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
    query('profile').optional().isIn(['driving', 'walking', 'cycling', 'bus']).withMessage('Invalid profile'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { start, end, profile = 'driving', waypoints } = req.query

      // Map bus to driving for routing engines (bus uses driving roads with duration adjustment)
      const routingProfile = profile === 'bus' ? 'driving' : profile

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
        const url = `${baseUrl.replace(/\/+$/, '')}/route/v1/${routingProfile}/${coordinatesStr}`
        const res = await axios.get(url, {
          params: { overview: 'full', geometries: 'geojson', steps: 'true' },
          timeout: 10000,
        })
        const r = res.data?.routes?.[0]
        if (r?.geometry?.coordinates?.length > 0) {
          return {
            distance: r.distance ?? 0,
            duration: r.duration ?? 0,
            geometry: r.geometry,
            legs: (r.legs || []).map((leg) => ({ distance: leg.distance ?? 0, duration: leg.duration ?? 0 })),
            steps: r.legs?.flatMap((leg) => leg.steps) ?? [],
          }
        }
        return null
      }

      /** Fetch from umnaapp-style API: /map/route/{profile}/{coords} */
      const tryUmnaapp = async () => {
        const url = `${ROUTE_BASE_URL}/${routingProfile}/${coordinatesStr}`
        for (const geom of ['geojson', 'polyline']) {
          try {
            const res = await axios.get(url, {
              params: { overview: 'full', geometries: geom, steps: 'true' },
              timeout: 10000,
            })
            const data = res.data
            const route = data.routes?.[0] ?? (data.geometry ? { geometry: data.geometry, distance: data.distance, duration: data.duration, legs: data.legs } : null)
            if (geom === 'geojson' && route?.geometry?.coordinates?.length > 0) {
              return { distance: route.distance ?? 0, duration: route.duration ?? 0, geometry: route.geometry, legs: (route.legs || []).map((leg) => ({ distance: leg.distance ?? 0, duration: leg.duration ?? 0 })), steps: route.legs?.flatMap((l) => l.steps) ?? [] }
            }
            if (geom === 'polyline' && typeof route?.geometry === 'string') {
              const dec = polyline.decode(route.geometry, 5)
              const coordinates = dec.map(([lat, lng]) => [lng, lat])
              return { distance: route.distance ?? 0, duration: route.duration ?? 0, geometry: { type: 'LineString', coordinates }, legs: (route.legs || []).map((leg) => ({ distance: leg.distance ?? 0, duration: leg.duration ?? 0 })), steps: route.legs?.flatMap((l) => l.steps) ?? [] }
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

      // Profile-based duration adjustments
      if (profile === 'bus' && routeData.duration) {
        // Bus is slower due to stops — ~1.4x driving duration
        routeData.duration = Math.round(routeData.duration * 1.4)
        if (routeData.legs) {
          routeData.legs = routeData.legs.map((leg) => ({ ...leg, duration: Math.round(leg.duration * 1.4) }))
        }
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

      // User-added places: approved for everyone; pending only for the contributor
      let dbResults = []
      if (prisma.place && q.length >= 2) {
        const searchTerm = q.trim()
        try {
          await autoApproveExpiredPendingPlaces()
          const viewerId = req.user.id
          const dbPlaces = await prisma.place.findMany({
            where: {
              AND: [
                placePublicVisibilityOr(viewerId),
                {
                  OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { placeNameEn: { contains: searchTerm, mode: 'insensitive' } },
                    { category: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              ],
            },
            take: 15,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, placeNameEn: true, placeNameLocal: true, category: true, latitude: true, longitude: true, userId: true, userName: true, source: true },
          })
          dbResults = dbPlaces.map((p) => ({
            placeId: p.id,
            displayName: p.placeNameEn ?? p.name,
            lat: p.latitude,
            lng: p.longitude,
            address: p.category ? { county: p.category } : null,
            isDbPlace: true,
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
      const result = await reverseGeocodeResult(lat, lng)
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
 * @desc Transliterate English/place text to local script using Aksharamukha
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

/** Map Google Places types (extract/search) to app category labels so map filters match. */
const GOOGLE_PLACE_TYPE_TO_CATEGORY = {
  restaurant: 'Restaurant',
  meal_takeaway: 'Restaurant',
  meal_delivery: 'Restaurant',
  cafe: 'Restaurant',
  bar: 'Restaurant',
  bakery: 'Restaurant',
  food: 'Restaurant',
  night_club: 'Restaurant',
  hospital: 'Hospital',
  doctor: 'Hospital',
  dentist: 'Hospital',
  physiotherapist: 'Hospital',
  veterinary_care: 'Hospital',
  lodging: 'Hotel',
  parking: 'Parking',
  convenience_store: 'Grocery Store',
  supermarket: 'Grocery Store',
  grocery_or_supermarket: 'Grocery Store',
  store: 'Shop',
  shopping_mall: 'Shop',
  clothing_store: 'Shop',
  electronics_store: 'Shop',
  furniture_store: 'Shop',
  hardware_store: 'Shop',
  home_goods_store: 'Shop',
  jewelry_store: 'Shop',
  shoe_store: 'Shop',
  book_store: 'Shop',
  florist: 'Shop',
  school: 'School',
  secondary_school: 'School',
  primary_school: 'School',
  university: 'School',
  hindu_temple: 'Temple',
  church: 'Temple',
  mosque: 'Temple',
  synagogue: 'Temple',
  place_of_worship: 'Temple',
  bank: 'Bank',
  atm: 'ATM',
  post_office: 'Post Office',
  bus_station: 'Bus Stop',
  bus_stop: 'Bus Stop',
  subway_station: 'Transit',
  train_station: 'Transit',
  transit_station: 'Transit',
  light_rail_station: 'Transit',
  police: 'Police Station',
  gas_station: 'Petrol Pump',
  tourist_attraction: 'Tourist Place',
  museum: 'Museum',
  pharmacy: 'Pharmacy',
  drugstore: 'Pharmacy',
  movie_theater: 'Cinema',
  gym: 'Gym',
  beauty_salon: 'Salon',
  hair_care: 'Salon',
  spa: 'Salon',
}

function mapGoogleTypeToCategory(rawType) {
  const type = String(rawType || '')
    .toLowerCase()
    .trim()
  if (GOOGLE_PLACE_TYPE_TO_CATEGORY[type]) return GOOGLE_PLACE_TYPE_TO_CATEGORY[type]
  if (PLACE_CATEGORIES.includes(String(rawType || '').trim())) return String(rawType).trim()
  return 'Other'
}

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

      const isSaved = source === 'saved'
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
          source: isSaved ? 'saved' : 'contribution',
          approvalStatus: isSaved ? 'approved' : 'pending',
          approvedAt: isSaved ? new Date() : null,
        },
      })

      res.status(201).json(
        attachApprovalMeta({
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
          approvalStatus: place.approvalStatus,
          approvedAt: place.approvedAt,
        })
      )
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
  [
    query('categories')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Categories filter is too long'),
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

      const selectedCategories = String(req.query.categories || '')
        .split(',')
        .map((category) => category.trim())
        .filter(Boolean)

      const where = {
        userId: req.user.id,
        ...(selectedCategories.length > 0
          ? { category: { in: selectedCategories } }
          : {}),
      }

      // Only return places belonging to this user (filter by userId; each user sees only their own)
      const places = await prisma.place.findMany({
        where,
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
          approvalStatus: true,
          approvedAt: true,
        },
      })

      const categoryCounts = await prisma.place.groupBy({
        by: ['category'],
        where: { userId: req.user.id },
        _count: { category: true },
        orderBy: { category: 'asc' },
      })

      await autoApproveExpiredPendingPlaces()

      // Normalize for API: name = place_name_en for backward compat
      const normalized = places.map((p) =>
        attachApprovalMeta({
          ...p,
          name: p.placeNameEn ?? p.name,
          place_name_en: p.placeNameEn ?? p.name,
          place_name_local: p.placeNameLocal,
          user_name: p.userName,
          user_email: p.userEmail,
        })
      )
      res.json({
        places: normalized,
        selectedCategories,
        availableCategories: categoryCounts.map((item) => ({
          category: item.category,
          count: item._count.category,
        })),
      })
    } catch (error) {
      console.error('List places error:', error)
      res.status(500).json({ error: 'Failed to fetch places', message: error.message })
    }
  }
)

/** Ray-cast point-in-polygon; ring = closed or open GeoJSON ring [lng,lat][] */
function pointInRing(lng, lat, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false
  const r = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring
  let inside = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0]
    const yi = r[i][1]
    const xj = r[j][0]
    const yj = r[j][1]
    const denom = yj - yi || 1e-12
    const intersect = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / denom + xi
    if (intersect) inside = !inside
  }
  return inside
}

function normalizePolygonBodyRing(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return null
  const outer = coordinates[0]
  if (!Array.isArray(outer) || outer.length < 3) return null
  const cleaned = outer
    .map((pt) => {
      if (!Array.isArray(pt) || pt.length < 2) return null
      const lng = Number(pt[0])
      const lat = Number(pt[1])
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null
      return [lng, lat]
    })
    .filter(Boolean)
  if (cleaned.length < 3) return null
  const first = cleaned[0]
  const last = cleaned[cleaned.length - 1]
  const closed = first[0] === last[0] && first[1] === last[1]
  const ring = closed ? cleaned : [...cleaned, [...first]]
  if (ring.length > 601) return null
  return ring
}

/**
 * @route POST /api/map/places/in-polygon
 * @desc Public places (approved + own pending) inside a GeoJSON polygon ring, optional category
 * @access Private
 */
router.post(
  '/places/in-polygon',
  authenticateToken,
  rateLimitMiddleware('places:in-polygon', 30, 60),
  [
    body('polygon').isObject().withMessage('polygon GeoJSON object required'),
    body('polygon.type').equals('Polygon').withMessage('polygon.type must be Polygon'),
    body('polygon.coordinates').isArray({ min: 1 }).withMessage('polygon.coordinates required'),
    body('category').optional().trim().isLength({ min: 1, max: 80 }),
  ],
  async (req, res) => {
    try {
      if (!prisma.place) {
        return res.status(503).json({ error: 'Place model not available' })
      }
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const ring = normalizePolygonBodyRing(req.body.polygon.coordinates)
      if (!ring) {
        return res.status(400).json({ error: 'Invalid polygon coordinates' })
      }

      const lats = ring.map((c) => c[1])
      const lngs = ring.map((c) => c[0])
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)

      const categoryRaw = String(req.body.category || '').trim()
      const categoryFilter = categoryRaw
        ? { category: { equals: categoryRaw, mode: 'insensitive' } }
        : {}

      await autoApproveExpiredPendingPlaces()
      const viewerId = req.user.id

      const candidates = await prisma.place.findMany({
        where: {
          AND: [
            placePublicVisibilityOr(viewerId),
            { latitude: { gte: minLat, lte: maxLat } },
            { longitude: { gte: minLng, lte: maxLng } },
            categoryFilter,
          ],
        },
        take: 2500,
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
          approvalStatus: true,
          approvedAt: true,
        },
      })

      const inside = candidates.filter((p) =>
        pointInRing(p.longitude, p.latitude, ring)
      )

      const normalized = inside.map((p) =>
        attachApprovalMeta({
          ...p,
          name: p.placeNameEn ?? p.name,
          place_name_en: p.placeNameEn ?? p.name,
          place_name_local: p.placeNameLocal,
          user_name: p.userName,
          user_email: p.userEmail,
        })
      )

      res.json({ places: normalized, count: normalized.length })
    } catch (error) {
      console.error('In-polygon places error:', error)
      res.status(500).json({ error: 'Failed to fetch places in area', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/places/bulk
 * @desc Save multiple extracted places at once, skipping duplicates
 * @access Private
 */
router.post(
  '/places/bulk',
  authenticateToken,
  rateLimitMiddleware('places:bulk', 10, 60),
  [
    body('places').isArray({ min: 1, max: 500 }).withMessage('places must be an array (1-500 items)'),
    body('places.*.name').trim().isLength({ min: 1, max: 200 }).withMessage('Each place needs a name (1-200 chars)'),
    body('places.*.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('places.*.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('places.*.type').optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      if (!prisma.place) {
        return res.status(503).json({ error: 'Place model not available' })
      }

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { places: incoming } = req.body
      const userId = req.user.id
      const userName = req.user.name || null
      const userEmail = req.user.email || null

      // Fetch existing places for this user to check duplicates by coordinates
      const existing = await prisma.place.findMany({
        where: { userId },
        select: { latitude: true, longitude: true },
      })

      const isDuplicate = (lat, lng) =>
        existing.some(
          (p) => Math.abs(p.latitude - lat) < 0.0001 && Math.abs(p.longitude - lng) < 0.0001
        )

      const toCreate = []
      const skipped = []

      for (const item of incoming) {
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lng)
        const name = (item.name || '').trim()
        if (!name || isNaN(lat) || isNaN(lng)) {
          skipped.push({ name, reason: 'invalid' })
          continue
        }
        if (isDuplicate(lat, lng)) {
          skipped.push({ name, reason: 'duplicate' })
          continue
        }
        // Also deduplicate within the batch itself
        if (toCreate.some((c) => Math.abs(c.latitude - lat) < 0.0001 && Math.abs(c.longitude - lng) < 0.0001)) {
          skipped.push({ name, reason: 'duplicate_in_batch' })
          continue
        }
        toCreate.push({
          name,
          placeNameEn: name,
          placeNameLocal: null,
          category: mapGoogleTypeToCategory(item.type),
          latitude: lat,
          longitude: lng,
          zoomLevel: 15,
          userId,
          userName,
          userEmail,
          source: 'contribution',
          approvalStatus: 'pending',
          approvedAt: null,
        })
      }

      let created = []
      if (toCreate.length > 0) {
        // Use createMany for efficiency, then fetch created records
        await prisma.place.createMany({ data: toCreate, skipDuplicates: true })

        // Fetch back the newly created places for this user
        created = await prisma.place.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: toCreate.length,
          select: {
            id: true, name: true, placeNameEn: true, placeNameLocal: true,
            category: true, latitude: true, longitude: true, zoomLevel: true,
            source: true, userId: true, userName: true, userEmail: true, createdAt: true,
            approvalStatus: true, approvedAt: true,
          },
        })

        created = created.map((p) =>
          attachApprovalMeta({
            ...p,
            name: p.placeNameEn ?? p.name,
            place_name_en: p.placeNameEn ?? p.name,
            place_name_local: p.placeNameLocal,
            user_name: p.userName,
            user_email: p.userEmail,
          })
        )
      }

      res.status(201).json({
        added: created.length,
        skipped: skipped.length,
        places: created,
      })
    } catch (error) {
      console.error('Bulk save places error:', error)
      res.status(500).json({ error: 'Failed to save places', message: error.message })
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

/**
 * @route GET /api/map/places/:id
 * @desc Get a single place by ID (any user's place)
 * @access Private
 */
router.get(
  '/places/:id',
  authenticateToken,
  rateLimitMiddleware('places:get', 120, 60),
  async (req, res) => {
    try {
      const { id } = req.params
      await autoApproveExpiredPendingPlaces()
      const place = await prisma.place.findUnique({
        where: { id },
        select: {
          id: true, name: true, placeNameEn: true, placeNameLocal: true,
          category: true, latitude: true, longitude: true, zoomLevel: true,
          source: true, userId: true, userName: true, userEmail: true, createdAt: true,
          approvalStatus: true, approvedAt: true,
        },
      })
      if (!place) return res.status(404).json({ error: 'Place not found' })
      if (!isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      res.json(
        attachApprovalMeta({
          ...place,
          name: place.placeNameEn ?? place.name,
          place_name_en: place.placeNameEn ?? place.name,
          place_name_local: place.placeNameLocal,
          user_name: place.userName,
        })
      )
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch place', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/places/:id/nearby
 * @desc Get nearby places (same category or within ~2km)
 * @access Private
 */
router.get(
  '/places/:id/nearby',
  authenticateToken,
  rateLimitMiddleware('places:nearby', 60, 60),
  async (req, res) => {
    try {
      const { id } = req.params
      await autoApproveExpiredPendingPlaces()
      const place = await prisma.place.findUnique({
        where: { id },
        select: { latitude: true, longitude: true, category: true, userId: true, approvalStatus: true },
      })
      if (!place) return res.status(404).json({ error: 'Place not found' })
      if (!isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }

      const delta = 0.018 // ~2km
      const nearby = await prisma.place.findMany({
        where: {
          AND: [
            placePublicVisibilityOr(req.user.id),
            {
              id: { not: id },
              latitude: { gte: place.latitude - delta, lte: place.latitude + delta },
              longitude: { gte: place.longitude - delta, lte: place.longitude + delta },
            },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, placeNameEn: true, category: true, latitude: true, longitude: true, userId: true, userName: true },
      })
      res.json(nearby.map((p) => ({ ...p, name: p.placeNameEn ?? p.name, place_name_en: p.placeNameEn ?? p.name })))
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch nearby places', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/places/:id/reviews
 * @desc Get all reviews for a place
 * @access Private
 */
router.get(
  '/places/:id/reviews',
  authenticateToken,
  rateLimitMiddleware('reviews:list', 120, 60),
  async (req, res) => {
    try {
      if (!prisma.placeReview) return res.json({ reviews: [], avgRating: null })
      await autoApproveExpiredPendingPlaces()
      const place = await prisma.place.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, approvalStatus: true },
      })
      if (!place || !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      const reviews = await prisma.placeReview.findMany({
        where: { placeId: req.params.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, userId: true, userName: true, rating: true, comment: true, createdAt: true },
      })
      const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null
      res.json({ reviews, avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null, count: reviews.length })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reviews', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/places/:id/reviews
 * @desc Add or update a review for a place
 * @access Private
 */
router.post(
  '/places/:id/reviews',
  authenticateToken,
  rateLimitMiddleware('reviews:create', 20, 60),
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment max 1000 chars'),
  ],
  async (req, res) => {
    try {
      if (!prisma.placeReview) return res.status(503).json({ error: 'Reviews not available. Run migration: add-reviews-photos.sql' })
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const { id: placeId } = req.params
      const { rating, comment } = req.body
      await autoApproveExpiredPendingPlaces()
      const place = await prisma.place.findUnique({
        where: { id: placeId },
        select: { id: true, userId: true, approvalStatus: true },
      })
      if (!place || !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }

      const review = await prisma.placeReview.upsert({
        where: { placeId_userId: { placeId, userId: req.user.id } },
        create: { placeId, userId: req.user.id, userName: req.user.name || null, rating: parseInt(rating), comment: comment?.trim() || null },
        update: { rating: parseInt(rating), comment: comment?.trim() || null, updatedAt: new Date() },
        select: { id: true, userId: true, userName: true, rating: true, comment: true, createdAt: true },
      })
      res.status(201).json(review)
    } catch (error) {
      res.status(500).json({ error: 'Failed to save review', message: error.message })
    }
  }
)

/**
 * @route DELETE /api/map/places/:id/reviews/:reviewId
 * @desc Delete own review
 * @access Private
 */
router.delete(
  '/places/:id/reviews/:reviewId',
  authenticateToken,
  rateLimitMiddleware('reviews:delete', 20, 60),
  async (req, res) => {
    try {
      if (!prisma.placeReview) return res.status(503).json({ error: 'Reviews not available' })
      const review = await prisma.placeReview.findFirst({
        where: { id: req.params.reviewId, userId: req.user.id },
        select: { id: true },
      })
      if (!review) return res.status(404).json({ error: 'Review not found or not authorized' })
      await prisma.placeReview.delete({ where: { id: req.params.reviewId } })
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete review', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/places/:id/photos
 * @desc Get all photos for a place
 * @access Private
 */
router.get(
  '/places/:id/photos',
  authenticateToken,
  rateLimitMiddleware('photos:list', 120, 60),
  async (req, res) => {
    try {
      if (!prisma.placePhoto) return res.json({ photos: [] })
      await autoApproveExpiredPendingPlaces()
      const place = await prisma.place.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, approvalStatus: true },
      })
      if (!place || !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      const photos = await prisma.placePhoto.findMany({
        where: { placeId: req.params.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, userId: true, userName: true, dataUrl: true, caption: true, createdAt: true },
      })
      res.json({ photos, count: photos.length })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch photos', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/places/:id/photos
 * @desc Upload a photo for a place (base64 data URL, max ~500KB after compression on client)
 * @access Private
 */
router.post(
  '/places/:id/photos',
  authenticateToken,
  rateLimitMiddleware('photos:create', 10, 60),
  [
    body('dataUrl').isString().isLength({ min: 50, max: 600000 }).withMessage('Valid image data required (max ~450KB)'),
    body('caption').optional().trim().isLength({ max: 200 }).withMessage('Caption max 200 chars'),
  ],
  async (req, res) => {
    try {
      if (!prisma.placePhoto) return res.status(503).json({ error: 'Photos not available. Run migration: add-reviews-photos.sql' })
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      await autoApproveExpiredPendingPlaces()
      const place = await prisma.place.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, approvalStatus: true },
      })
      if (!place || !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }

      // Limit 10 photos per place per user
      const count = await prisma.placePhoto.count({ where: { placeId: req.params.id, userId: req.user.id } })
      if (count >= 10) return res.status(429).json({ error: 'Max 10 photos per place' })

      const photo = await prisma.placePhoto.create({
        data: { placeId: req.params.id, userId: req.user.id, userName: req.user.name || null, dataUrl: req.body.dataUrl, caption: req.body.caption?.trim() || null },
        select: { id: true, userId: true, userName: true, dataUrl: true, caption: true, createdAt: true },
      })
      res.status(201).json(photo)
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload photo', message: error.message })
    }
  }
)

/**
 * @route DELETE /api/map/places/:placeId/photos/:photoId
 * @desc Delete own photo
 * @access Private
 */
router.delete(
  '/places/:placeId/photos/:photoId',
  authenticateToken,
  rateLimitMiddleware('photos:delete', 20, 60),
  async (req, res) => {
    try {
      if (!prisma.placePhoto) return res.status(503).json({ error: 'Photos not available' })
      const photo = await prisma.placePhoto.findFirst({
        where: { id: req.params.photoId, userId: req.user.id },
        select: { id: true },
      })
      if (!photo) return res.status(404).json({ error: 'Photo not found or not authorized' })
      await prisma.placePhoto.delete({ where: { id: req.params.photoId } })
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete photo', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/config
 * @desc Return public client-side config (Google Maps API key)
 * @access Private
 */
router.get('/config', authenticateToken, (req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  })
})

export default router
