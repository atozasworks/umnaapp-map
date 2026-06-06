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
  enrichPlaceApprovalMeta,
  initialApprovalFields,
} from '../services/placeApproval.js'
import { onPlaceCreated } from '../services/notificationService.js'
import {
  buildPlaceDetailFields,
  serializePlace,
  PLACE_DETAIL_SELECT,
  sanitizePlaceName,
} from '../utils/placePayload.js'
import {
  PlaceDuplicateIndex,
  findPlaceDuplicate,
  checkAgainstBatch,
  rememberInBatch,
  candidateFromPayload,
  DUPLICATE_MESSAGES,
} from '../utils/placeDuplicate.js'
import { runAskMapsQuery } from '../services/groqAskMapsService.js'
import {
  axiosWithRetry,
  normalizeSearchRowAddress,
  searchExternalProviders,
} from '../services/externalPlaceSearch.js'
import { getPlacesQuotaConfig } from '../utils/placesQuotaConfig.js'
import {
  GRID_EXTRACT_MAX_PLACES,
  usedGridExtractToday,
} from '../utils/gridExtractLimit.js'
import { canUserDeletePlace } from '../utils/placeOwnership.js'
import {
  processAlternativeRoutes,
  toRouteArray,
  hasMultipleRoutes,
  buildDirectRoute,
} from '../utils/routeHelpers.js'

const router = express.Router()

function attachApprovalMeta(p) {
  return enrichPlaceApprovalMeta(p)
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
/** CORS-safe fallback when umnaapp tile host is down or returns HTML errors. */
const CARTO_TILE_FALLBACK = 'https://a.basemaps.cartocdn.com/light_all'

const isValidPngBuffer = (buf) =>
  Buffer.isBuffer(buf) &&
  buf.length > 8 &&
  buf[0] === 0x89 &&
  buf[1] === 0x50 &&
  buf[2] === 0x4e &&
  buf[3] === 0x47

const NOMINATIM_PUBLIC = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_PUBLIC_SEARCH = 'https://nominatim.openstreetmap.org/search'
const UMNAAPP_NOMINATIM_SEARCH = 'https://umnaapp.in/map/nominatim/search'

const SEARCH_SIMPLE_TIMEOUT = parseInt(process.env.SEARCH_SIMPLE_TIMEOUT, 10) || 20000
const SEARCH_SIMPLE_RETRIES = parseInt(process.env.SEARCH_SIMPLE_RETRIES, 10) || 3

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
    const base = TILESERVER_URL.replace(/\/+$/, '')
    // umnaapp nginx: /tiles/ ; TileServer GL: /data/india/
    const tileUrls = [
      `${base}/tiles/${z}/${x}/${y}.png`,
      `${base}/data/india/${z}/${x}/${y}.png`,
    ]

    for (const tileUrl of tileUrls) {
      try {
        const tileResponse = await axios.get(tileUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
          headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0' },
          validateStatus: (status) => status === 200,
        })

        const buf = Buffer.from(tileResponse.data)
        if (!isValidPngBuffer(buf)) continue

        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', tileResponse.headers['cache-control'] || 'public, max-age=86400')
        res.send(buf)
        return
      } catch {
        continue
      }
    }

    try {
      const fallbackUrl = `${CARTO_TILE_FALLBACK}/${z}/${x}/${y}.png`
      const tileResponse = await axios.get(fallbackUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0' },
      })
      const buf = Buffer.from(tileResponse.data)
      if (!isValidPngBuffer(buf)) {
        res.status(502).send('Failed to fetch tile')
        return
      }
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=604800')
      res.send(buf)
    } catch (error) {
      console.error('Tile proxy fallback error:', error.message)
      res.status(502).send('Failed to fetch tile')
    }
  } catch (error) {
    console.error('Tile proxy error:', error.message)
    res.status(502).send('Failed to fetch tile')
  }
})

/**
 * @route GET /api/map/route
 * @desc Get route between two or more points using UMNAAPP routing service
 * @access Private
 * @see https://umnaapp.in/route/v1/{profile}/{lon1,lat1;lon2,lat2}?overview=full&geometries=geojson&steps=true
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

      const { start, end, profile = 'driving', waypoints, alternatives } = req.query
      const wantAlternatives = alternatives === 'true'

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

      const parseOsrmRoute = (r) => {
        if (!r?.geometry?.coordinates?.length) return null
        return {
          distance: r.distance ?? 0,
          duration: r.duration ?? 0,
          geometry: r.geometry,
          legs: (r.legs || []).map((leg) => ({ distance: leg.distance ?? 0, duration: leg.duration ?? 0 })),
          steps: r.legs?.flatMap((leg) => leg.steps) ?? [],
        }
      }

      /** Fetch from OSRM-style API: /route/v1/{profile}/{coords} */
      const tryOsrm = async (baseUrl, requestAlternatives = wantAlternatives) => {
        const url = `${baseUrl.replace(/\/+$/, '')}/route/v1/${routingProfile}/${coordinatesStr}`
        const params = { overview: 'full', geometries: 'geojson', steps: 'true' }
        if (requestAlternatives) params.alternatives = 'true'

        const fetchRoutes = async (p) => {
          const res = await axios.get(url, { params: p, timeout: 10000 })
          const contentType = String(res.headers?.['content-type'] || '')
          if (contentType.includes('text/html') || typeof res.data === 'string') {
            throw new Error('Not an OSRM API (HTML response)')
          }
          if (res.data?.code && res.data.code !== 'Ok') {
            throw new Error(res.data.message || res.data.code)
          }
          return res.data?.routes || []
        }

        let routes = []
        try {
          routes = await fetchRoutes(params)
        } catch (altErr) {
          if (requestAlternatives) {
            routes = await fetchRoutes({ overview: 'full', geometries: 'geojson', steps: 'true' })
          } else {
            throw altErr
          }
        }

        if (wantAlternatives && routes.length > 0) {
          return routes.map(parseOsrmRoute).filter(Boolean).slice(0, 3)
        }
        const parsed = parseOsrmRoute(routes[0])
        return parsed ? (wantAlternatives ? [parsed] : parsed) : null
      }

      const parseUmnaappRoute = (route, geom) => {
        if (geom === 'geojson' && route?.geometry?.coordinates?.length > 0) {
          return { distance: route.distance ?? 0, duration: route.duration ?? 0, geometry: route.geometry, legs: (route.legs || []).map((leg) => ({ distance: leg.distance ?? 0, duration: leg.duration ?? 0 })), steps: route.legs?.flatMap((l) => l.steps) ?? [] }
        }
        if (geom === 'polyline' && typeof route?.geometry === 'string') {
          const dec = polyline.decode(route.geometry, 5)
          const coordinates = dec.map(([lat, lng]) => [lng, lat])
          return { distance: route.distance ?? 0, duration: route.duration ?? 0, geometry: { type: 'LineString', coordinates }, legs: (route.legs || []).map((leg) => ({ distance: leg.distance ?? 0, duration: leg.duration ?? 0 })), steps: route.legs?.flatMap((l) => l.steps) ?? [] }
        }
        return null
      }

      /** Fetch from umnaapp-style API: /map/route/{profile}/{coords} */
      const tryUmnaapp = async () => {
        const url = `${ROUTE_BASE_URL}/${routingProfile}/${coordinatesStr}`
        for (const geom of ['geojson', 'polyline']) {
          try {
            const params = { overview: 'full', geometries: geom, steps: 'true' }
            if (wantAlternatives) params.alternatives = 'true'
            const res = await axios.get(url, { params, timeout: 10000 })
            const contentType = String(res.headers?.['content-type'] || '')
            if (contentType.includes('text/html') || typeof res.data === 'string') {
              continue
            }
            const data = res.data
            const allRoutes = data.routes || []
            if (wantAlternatives && allRoutes.length > 0) {
              const altParsed = allRoutes.map((r) => parseUmnaappRoute(r, geom)).filter(Boolean).slice(0, 3)
              if (altParsed.length > 0) return altParsed
            }
            const route = allRoutes[0] ?? (data.geometry ? { geometry: data.geometry, distance: data.distance, duration: data.duration, legs: data.legs } : null)
            const singleParsed = parseUmnaappRoute(route, geom)
            if (singleParsed) return wantAlternatives ? [singleParsed] : singleParsed
          } catch (e) {
            if (geom === 'geojson') console.warn('Route umnaapp GeoJSON failed:', e.message)
          }
        }
        return null
      }

      // 1) umnaapp.in standard OSRM — https://umnaapp.in/route/v1/{profile}/{coords}
      try {
        routeData = await tryOsrm(ROUTE_SERVICE_URL)
        if (routeData) console.log('🗺️  Route from umnaapp.in/route')
      } catch (e) {
        console.warn('Route umnaapp.in/route failed:', e.message)
      }

      const needsMoreAlternatives = wantAlternatives && !hasMultipleRoutes(routeData)

      // 2) Legacy umnaapp /map/route/... (custom wrapper, if deployed)
      if (!routeData || needsMoreAlternatives) {
        try {
          const legacy = await tryUmnaapp()
          if (legacy) {
            if (needsMoreAlternatives && hasMultipleRoutes(legacy)) {
              routeData = legacy
              console.log('🗺️  Alternative routes from umnaapp /map/route')
            } else if (!routeData) {
              routeData = legacy
              console.log('🗺️  Route from umnaapp /map/route')
            }
          }
        } catch (e) {
          console.warn('Route umnaapp /map/route failed:', e.message)
        }
      }

      // 3) OSRM_URL (Docker/local) — dev fallback or extra alternatives
      if ((!routeData || needsMoreAlternatives) && OSRM_URL) {
        try {
          const osrmRoutes = await tryOsrm(OSRM_URL)
          if (osrmRoutes) {
            if (needsMoreAlternatives && hasMultipleRoutes(osrmRoutes)) {
              routeData = osrmRoutes
              console.log('🗺️  Alternative routes from OSRM_URL')
            } else if (!routeData) {
              routeData = osrmRoutes
              console.log('🗺️  Route from OSRM_URL')
            }
          }
        } catch (e) {
          console.warn('Route OSRM_URL failed:', e.message)
        }
      }

      // 4) Public OSRM demo
      if (!routeData || (wantAlternatives && !hasMultipleRoutes(routeData))) {
        try {
          const osrmRoutes = await tryOsrm(OSRM_PUBLIC)
          if (osrmRoutes) {
            if (wantAlternatives && hasMultipleRoutes(osrmRoutes)) {
              routeData = osrmRoutes
              console.log('🗺️  Alternative routes from OSRM public')
            } else if (!routeData) {
              routeData = osrmRoutes
              console.log('🗺️  Route from OSRM public')
            }
          }
        } catch (e) {
          console.warn('Route OSRM public failed:', e.message)
        }
      }

      if (wantAlternatives && routeData) {
        const processed = processAlternativeRoutes(toRouteArray(routeData))
        if (processed.length > 0) routeData = processed
      }

      let primaryRoute = Array.isArray(routeData) ? routeData[0] : routeData
      if (!primaryRoute?.geometry?.coordinates?.length) {
        const fallback = buildDirectRoute(
          startCoords[0],
          startCoords[1],
          endCoords[0],
          endCoords[1],
          routingProfile
        )
        routeData = wantAlternatives ? [fallback] : fallback
        primaryRoute = fallback
        console.warn('Route services unavailable — using direct fallback path')
      }

      const finalRoutes = toRouteArray(routeData)

      // Profile-based duration adjustments
      const adjustBusDuration = (rd) => {
        if (profile === 'bus' && rd.duration) {
          rd.duration = Math.round(rd.duration * 1.4)
          if (rd.legs) {
            rd.legs = rd.legs.map((leg) => ({ ...leg, duration: Math.round(leg.duration * 1.4) }))
          }
        }
        return rd
      }

      finalRoutes.forEach(adjustBusDuration)
      routeData = wantAlternatives ? finalRoutes : finalRoutes[0]
      primaryRoute = finalRoutes[0]

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
            distance: primaryRoute.distance,
            duration: Math.round(primaryRoute.duration),
            polyline: JSON.stringify(primaryRoute.geometry),
            status: 'planned',
          },
        })
      }

      if (wantAlternatives) {
        res.json({ routes: finalRoutes })
      } else {
        res.json(finalRoutes[0])
      }
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
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const parsed = new URL(req.originalUrl, `http://${req.get('host') || 'localhost'}`)
    const params = Object.fromEntries(parsed.searchParams)
    const q = (params.q || '').trim()

    // 1) Database search (user-added places) — runs independently so the
    //    user always sees their own saved places even when the upstream
    //    geocoder is down.
    let dbResults = []
    if (prisma.place && q.length >= 2) {
      try {
        await autoApproveExpiredPendingPlaces()
        const viewerId = req.user.id
        const dbPlaces = await prisma.place.findMany({
          where: {
            AND: [
              placePublicVisibilityOr(viewerId),
              {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { placeNameEn: { contains: q, mode: 'insensitive' } },
                  { placeNameLocal: { contains: q, mode: 'insensitive' } },
                  { category: { contains: q, mode: 'insensitive' } },
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

    // 2) Upstream geocoders — try primary then fall back to alternatives.
    //    Isolated from DB results so a dead upstream never blanks out
    //    user-saved places.
    let apiResults = []
    let usedProvider = null
    let upstreamError = null
    const { provider, rows, error } = await searchExternalProviders(q, { limit: 10 })
    if (provider) {
      usedProvider = provider
      apiResults = rows.map((r, i) => {
        const n = normalizeSearchRowAddress(r)
        return {
          placeId: n.place_id ?? n.id ?? n.osm_id ?? `api-${n.lat}-${n.lon ?? n.lng}-${i}`,
          displayName: n.display_name ?? n.name ?? n.formatted ?? '',
          lat: parseFloat(n.lat) || 0,
          lng: parseFloat(n.lon ?? n.lng) || 0,
          address: n.address ?? null,
          source: n._provider || null,
        }
      })
    } else if (error) {
      upstreamError = `${error.provider}: ${error.reason}`
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

    console.log(
      `[search-simple] q="${q}" → DB places: ${dbResults.length}, ` +
        `geocoder (${usedProvider || 'none'}): ${apiResults.length}, ` +
        `merged total: ${merged.length}` +
        (upstreamError ? ` | upstream error: ${upstreamError}` : '')
    )

    // Only surface an error when we have absolutely nothing to show AND
    // the upstream failed. Otherwise return 200 with whatever we have.
    if (merged.length === 0 && upstreamError) {
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
      results: merged,
      count: merged.length,
      ...(usedProvider ? { provider: usedProvider } : {}),
      ...(upstreamError ? { upstreamUnavailable: true } : {}),
    })
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

function buildPlaceCreateRow(item, userId, userName, userEmail, options = {}) {
  const lat = parseFloat(item.lat ?? item.latitude)
  const lng = parseFloat(item.lng ?? item.longitude)
  const addressCtx = {
    village: item.village,
    taluk: item.taluk,
    district: item.district,
    state: item.state,
    country: item.country,
    pincode: item.pincode,
  }
  const rawName = String(item.name || item.place_name_en || '').trim()
  const name = sanitizePlaceName(rawName, addressCtx) || rawName
  const localName = sanitizePlaceName(item.place_name_local, addressCtx)
  const details = buildPlaceDetailFields(item, {
    village: item.village,
    taluk: item.taluk,
    district: item.district,
    state: item.state,
    country: item.country,
  })
  const source = options.source || 'contribution'
  const zoomLevel = parseFloat(item.zoomLevel ?? item.zoom_level ?? 15)

  return {
    name,
    placeNameEn: name,
    placeNameLocal: localName,
    category: mapGoogleTypeToCategory(item.category || item.type || details.googleType),
    latitude: lat,
    longitude: lng,
    zoomLevel: Number.isFinite(zoomLevel) ? zoomLevel : 15,
    userId,
    userName,
    userEmail,
    source: source === 'saved' ? 'saved' : 'contribution',
    ...initialApprovalFields(),
    ...details,
  }
}

/**
 * @route POST /api/map/places/check-duplicate
 * @desc Check if a place already exists (Google ID, coordinates, name+address)
 * @access Private
 */
router.post(
  '/places/check-duplicate',
  authenticateToken,
  rateLimitMiddleware('places:check-dup', 120, 60),
  async (req, res) => {
    try {
      if (!prisma.place) return res.status(503).json({ error: 'Place model not available' })
      const excludePlaceId = req.body.excludePlaceId || req.body.exclude_place_id || null
      const dup = await findPlaceDuplicate(prisma, req.body, { excludePlaceId })
      res.json(dup)
    } catch (error) {
      console.error('Check duplicate error:', error)
      res.status(500).json({ error: 'Failed to check duplicate', message: error.message })
    }
  }
)

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
      // Strip any accidentally-included full-address tail before persisting.
      // Only the specific name (e.g. "Navyasuresh house") is saved as the place
      // name; admin/area parts live in their own columns.
      const addressCtx = {
        village: req.body.village,
        taluk: req.body.taluk,
        district: req.body.district,
        state: req.body.state,
        country: req.body.country,
        pincode: req.body.pincode,
      }
      const rawNameEn = (place_name_en || '').trim()
      const nameEn = sanitizePlaceName(rawNameEn, addressCtx) || rawNameEn
      const nameLocal = sanitizePlaceName(place_name_local, addressCtx)

      const dup = await findPlaceDuplicate(prisma, req.body)
      if (dup.duplicate) {
        return res.status(409).json({
          error: 'Duplicate place',
          reason: dup.reason,
          message: dup.message,
          existingPlaceId: dup.existingPlaceId,
          existingPlaceName: dup.existingPlaceName,
        })
      }

      const isSaved = source === 'saved'
      const detailFields = buildPlaceDetailFields(req.body)
      const place = await prisma.place.create({
        data: {
          name: nameEn,
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
          ...initialApprovalFields(),
          ...detailFields,
        },
      })

      if (!isSaved) {
        onPlaceCreated(place, { id: userId, name: userName }).catch((err) => {
          console.error('[notify] onPlaceCreated bg error:', err)
        })
      }

      res.status(201).json(attachApprovalMeta(serializePlace(place)))
    } catch (error) {
      console.error('Save place error:', error)
      res.status(500).json({ error: 'Failed to save place', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/places
 * @desc Places visible on the map: all approved + current user's pending/rejected
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

      await autoApproveExpiredPendingPlaces()
      const viewerId = req.user.id

      const selectedCategories = String(req.query.categories || '')
        .split(',')
        .map((category) => category.trim())
        .filter(Boolean)

      const categoryFilter =
        selectedCategories.length > 0 ? { category: { in: selectedCategories } } : {}

      const visibilityWhere = {
        AND: [placePublicVisibilityOr(viewerId), categoryFilter],
      }

      const places = await prisma.place.findMany({
        where: visibilityWhere,
        orderBy: { createdAt: 'desc' },
        take: 5000,
        select: {
          id: true,
          name: true,
          placeNameEn: true,
          placeNameLocal: true,
          category: true,
          latitude: true,
          longitude: true,
          zoomLevel: true,
          mapRenderingConfig: true,
          source: true,
          userId: true,
          userName: true,
          userEmail: true,
          createdAt: true,
          approvalStatus: true,
          approvedAt: true,
          autoApproveAt: true,
        },
      })

      const categoryCounts = await prisma.place.groupBy({
        by: ['category'],
        where: placePublicVisibilityOr(viewerId),
        _count: { category: true },
        orderBy: { category: 'asc' },
      })

      const normalized = places.map((p) =>
        attachApprovalMeta({
          ...p,
          name: p.placeNameEn ?? p.name,
          place_name_en: p.placeNameEn ?? p.name,
          place_name_local: p.placeNameLocal,
          map_rendering_config: p.mapRenderingConfig,
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
    body('places.*.place_id').optional().trim().isLength({ max: 255 }),
    body('places.*.zoomLevel').optional().isFloat({ min: 0, max: 22 }),
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

      const dupIndex = await PlaceDuplicateIndex.load(prisma)
      const batchSeen = []
      const created = []
      const skipped = []

      for (const item of incoming) {
        const name = (item.name || '').trim()
        const candidate = candidateFromPayload(item)
        if (!name || !Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) {
          skipped.push({ name, reason: 'invalid', message: DUPLICATE_MESSAGES.invalid })
          continue
        }

        const dbDup = dupIndex.check(candidate)
        if (dbDup.duplicate) {
          skipped.push({ name, reason: dbDup.reason, message: dbDup.message })
          continue
        }

        const batchDup = checkAgainstBatch(batchSeen, candidate)
        if (batchDup.duplicate) {
          skipped.push({ name, reason: batchDup.reason, message: batchDup.message })
          continue
        }

        try {
          const row = buildPlaceCreateRow(item, userId, userName, userEmail)
          const place = await prisma.place.create({ data: row })
          dupIndex.byGoogleId.set(place.googlePlaceId, place)
          dupIndex.coordRows.push({ row: place, lat: place.latitude, lng: place.longitude })
          if (candidate.nameKey && candidate.addressKey) {
            dupIndex.nameAddress.set(`${candidate.nameKey}|${candidate.addressKey}`, place)
          }
          rememberInBatch(batchSeen, candidate)
          if (place.source !== 'saved') {
            onPlaceCreated(place, { id: userId, name: userName }).catch(() => {})
          }
          created.push(attachApprovalMeta(serializePlace(place)))
        } catch (err) {
          if (err.code === 'P2002') {
            skipped.push({
              name,
              reason: 'google_place_id',
              message: DUPLICATE_MESSAGES.google_place_id,
            })
          } else {
            throw err
          }
        }
      }

      res.status(201).json({
        added: created.length,
        skipped: skipped.length,
        skippedDetails: skipped,
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

      const place = await prisma.place.findUnique({
        where: { id: id.trim() },
        select: { id: true, userId: true },
      })

      if (!place) {
        return res.status(404).json({ error: 'Place not found' })
      }

      if (!canUserDeletePlace(place, req.user)) {
        return res.status(403).json({ error: 'Not authorized to delete this place' })
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
        select: PLACE_DETAIL_SELECT,
      })
      if (!place) return res.status(404).json({ error: 'Place not found' })
      if (!isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      res.json(attachApprovalMeta(serializePlace(place)))
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
 * Favorites — personal user bookmarks of locations.
 *
 * A favorite never creates or deletes a Place row. It is a lightweight
 * many-to-many style relation between a user and either an existing
 * Place (placeId set) or an arbitrary lat/lng (e.g. an OSM search
 * result that isn't in our DB). Use these endpoints from the bookmark
 * icon in the UI — they are independent of the Place duplicate-check
 * flow used by Add Place / Place Detail save.
 */

/**
 * @route GET /api/map/favorites
 * @desc List the current user's favorites (most recent first)
 * @access Private
 */
router.get(
  '/favorites',
  authenticateToken,
  rateLimitMiddleware('favorites:list', 120, 60),
  async (req, res) => {
    try {
      if (!prisma.favorite) {
        return res.status(503).json({
          error: 'Favorites not available',
          message: 'Run migration: backend/prisma/add-favorites.sql, then `npx prisma generate` and restart.',
        })
      }
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      res.json({ favorites, count: favorites.length })
    } catch (error) {
      console.error('List favorites error:', error)
      res.status(500).json({ error: 'Failed to fetch favorites', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/favorites
 * @desc Add a place to the current user's favorites
 * @access Private
 */
router.post(
  '/favorites',
  authenticateToken,
  rateLimitMiddleware('favorites:create', 60, 60),
  async (req, res) => {
    try {
      if (!prisma.favorite) {
        return res.status(503).json({
          error: 'Favorites not available',
          message: 'Run migration: backend/prisma/add-favorites.sql, then `npx prisma generate` and restart.',
        })
      }

      const lat = parseFloat(req.body.latitude)
      const lng = parseFloat(req.body.longitude)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Valid latitude is required (-90 to 90).' })
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Valid longitude is required (-180 to 180).' })
      }

      const name = String(req.body.name ?? '').trim().slice(0, 300) || 'Unnamed place'
      const placeIdRaw = req.body.placeId
      const userId = req.user.id

      let category = req.body.category
      if (category != null && typeof category === 'object') {
        category = category.county ?? category.amenity ?? category.type ?? null
      }
      if (category != null) {
        category = String(category).trim().slice(0, 100)
        if (!category) category = null
      }

      let address = req.body.address
      if (address != null && (typeof address !== 'object' || Array.isArray(address))) {
        address = null
      }

      // If a placeId is provided, verify it actually exists. (Stale IDs are
      // silently dropped so we still save the bookmark by coords.)
      let resolvedPlaceId = null
      if (placeIdRaw && /^[0-9a-f-]{36}$/.test(String(placeIdRaw))) {
        const exists = await prisma.place.findUnique({
          where: { id: String(placeIdRaw) },
          select: { id: true },
        })
        if (exists) resolvedPlaceId = exists.id
      }

      // Dedupe: same user + same placeId, OR same user + close coords (~11m).
      const tol = 0.0001
      const existing = await prisma.favorite.findFirst({
        where: {
          userId,
          OR: [
            ...(resolvedPlaceId ? [{ placeId: resolvedPlaceId }] : []),
            {
              latitude: { gte: lat - tol, lte: lat + tol },
              longitude: { gte: lng - tol, lte: lng + tol },
            },
          ],
        },
      })
      if (existing) {
        return res.status(200).json({ favorite: existing, alreadyExists: true })
      }

      const favorite = await prisma.favorite.create({
        data: {
          userId,
          placeId: resolvedPlaceId,
          name,
          latitude: lat,
          longitude: lng,
          category,
          address,
        },
      })

      res.status(201).json({ favorite })
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint on (userId, placeId)
        return res.status(409).json({ error: 'Already in favorites' })
      }
      console.error('Create favorite error:', error)
      res.status(500).json({ error: 'Failed to save favorite', message: error.message })
    }
  }
)

/**
 * @route DELETE /api/map/favorites/:id
 * @desc Remove a favorite by its id
 * @access Private
 */
router.delete(
  '/favorites/:id',
  authenticateToken,
  rateLimitMiddleware('favorites:delete', 60, 60),
  async (req, res) => {
    try {
      if (!prisma.favorite) {
        return res.status(503).json({ error: 'Favorites not available' })
      }
      const favorite = await prisma.favorite.findFirst({
        where: { id: req.params.id, userId: req.user.id },
        select: { id: true },
      })
      if (!favorite) return res.status(404).json({ error: 'Favorite not found' })
      await prisma.favorite.delete({ where: { id: favorite.id } })
      res.json({ success: true, id: favorite.id })
    } catch (error) {
      console.error('Delete favorite error:', error)
      res.status(500).json({ error: 'Failed to remove favorite', message: error.message })
    }
  }
)

/**
 * @route DELETE /api/map/favorites
 * @desc Remove a favorite by coordinates or placeId (used by bookmark toggle
 *       when the client only knows the location, not the favorite id)
 * @access Private
 */
router.delete(
  '/favorites',
  authenticateToken,
  rateLimitMiddleware('favorites:delete', 60, 60),
  [
    query('placeId').optional().isString().isLength({ max: 200 }),
    query('lat').optional().isFloat({ min: -90, max: 90 }),
    query('lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  async (req, res) => {
    try {
      if (!prisma.favorite) {
        return res.status(503).json({ error: 'Favorites not available' })
      }
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { placeId } = req.query
      const lat = req.query.lat != null ? parseFloat(req.query.lat) : null
      const lng = req.query.lng != null ? parseFloat(req.query.lng) : null

      if (!placeId && (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng))) {
        return res.status(400).json({ error: 'placeId or lat & lng required' })
      }

      const tol = 0.0001
      const candidate = await prisma.favorite.findFirst({
        where: {
          userId: req.user.id,
          OR: [
            ...(placeId ? [{ placeId: String(placeId) }] : []),
            ...(Number.isFinite(lat) && Number.isFinite(lng)
              ? [
                  {
                    latitude: { gte: lat - tol, lte: lat + tol },
                    longitude: { gte: lng - tol, lte: lng + tol },
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      })

      if (!candidate) return res.status(404).json({ error: 'Favorite not found' })
      await prisma.favorite.delete({ where: { id: candidate.id } })
      res.json({ success: true, id: candidate.id })
    } catch (error) {
      console.error('Delete favorite by-coords error:', error)
      res.status(500).json({ error: 'Failed to remove favorite', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/ask
 * @desc Natural-language place search (Groq intent + DB results)
 * @access Private
 */
router.post(
  '/ask',
  authenticateToken,
  rateLimitMiddleware('map:ask', 40, 60),
  [
    body('query').trim().isLength({ min: 2, max: 500 }).withMessage('Query must be 2–500 characters'),
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { query, lat, lng } = req.body
      const userLat = lat != null ? parseFloat(lat) : null
      const userLng = lng != null ? parseFloat(lng) : null

      const result = await runAskMapsQuery({
        query,
        userLat: Number.isFinite(userLat) ? userLat : null,
        userLng: Number.isFinite(userLng) ? userLng : null,
        viewerId: req.user.id,
      })

      res.json(result)
    } catch (error) {
      console.error('Ask Maps error:', error)
      res.status(500).json({ error: 'Ask Maps failed', message: error.message })
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
    placesQuota: getPlacesQuotaConfig(),
    gridExtract: {
      maxPlaces: GRID_EXTRACT_MAX_PLACES,
      oncePerDay: true,
    },
  })
})

/**
 * @route GET /api/map/grid-extract/status
 * @desc Whether the user can run grid extract today
 */
router.get('/grid-extract/status', authenticateToken, async (req, res) => {
  try {
    const row = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { lastGridExtractAt: true },
    })
    const usedToday = usedGridExtractToday(row?.lastGridExtractAt)
    res.json({
      canExtract: !usedToday,
      usedToday,
      maxPlaces: GRID_EXTRACT_MAX_PLACES,
      lastExtractAt: row?.lastGridExtractAt ?? null,
    })
  } catch (error) {
    console.error('grid-extract status error:', error)
    res.status(500).json({ error: 'Failed to load grid extract status' })
  }
})

/**
 * @route POST /api/map/grid-extract/consume
 * @desc Reserve the user's once-per-day grid extract slot (call at start of extraction)
 */
router.post('/grid-extract/consume', authenticateToken, async (req, res) => {
  try {
    const row = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { lastGridExtractAt: true },
    })
    if (usedGridExtractToday(row?.lastGridExtractAt)) {
      return res.status(429).json({
        error: 'GRID_EXTRACT_DAILY_LIMIT',
        message: 'You have already used grid extract today. You can extract again tomorrow.',
        usedToday: true,
        maxPlaces: GRID_EXTRACT_MAX_PLACES,
      })
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { lastGridExtractAt: new Date() },
      select: { lastGridExtractAt: true },
    })
    res.json({
      ok: true,
      maxPlaces: GRID_EXTRACT_MAX_PLACES,
      lastExtractAt: updated.lastGridExtractAt,
    })
  } catch (error) {
    console.error('grid-extract consume error:', error)
    res.status(500).json({ error: 'Failed to start grid extract' })
  }
})

export default router
