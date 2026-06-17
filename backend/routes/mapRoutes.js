import express from 'express'
import { URL } from 'url'
import axios from 'axios'
import polyline from '@mapbox/polyline'
import { body, query, validationResult } from 'express-validator'
import { authenticateToken, optionalAuth } from '../middleware/auth.js'
import { cacheMiddleware } from '../middleware/cache.js'
import { rateLimitMiddleware, tieredRateLimitMiddleware } from '../middleware/rateLimit.js'
import prisma from '../config/database.js'
import { translateText, getLanguageFromAddress } from '../services/translateService.js'
import {
  autoApproveExpiredPendingPlaces,
  removeExpiredFestivals,
  placePublicVisibilityOr,
  isPlaceVisibleToUser,
  enrichPlaceApprovalMeta,
  initialApprovalFields,
} from '../services/placeApproval.js'
import { onPlaceCreated, onPlaceApproved } from '../services/notificationService.js'
import {
  recordPlaceAuditAsync,
  getPlaceHistory,
  userActor,
  computeChanges,
  PLACE_AUDIT_ACTIONS,
} from '../services/placeAudit.js'
import {
  buildPlaceDetailFields,
  serializePlace,
  serializeOsmPlace,
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
import { runMapAssistant } from '../services/mapAssistantService.js'
import { findNearbyPostgis, findInPolygonPostgis } from '../services/placeSpatial.js'
import {
  axiosWithRetry,
  normalizeSearchRowAddress,
  searchExternalProviders,
} from '../services/externalPlaceSearch.js'
import {
  unifiedTextSearch,
  unifiedMapPlaces,
  unifiedNearby,
  unifiedInPolygon,
  unifiedPlaceById,
  unifiedPickAtPoint,
  isOsmPlaceId,
} from '../services/unifiedPlaceQuery.js'
import { isPersistedSource } from '../utils/placeSource.js'
import { getPlacesQuotaConfig } from '../utils/placesQuotaConfig.js'
import { buildNormalizedAddressFields } from '../utils/osmAddress.js'
import {
  GRID_EXTRACT_MAX_PLACES,
  EXTRACT_MAX_AREA_KM2,
  usedGridExtractToday,
} from '../utils/gridExtractLimit.js'
import { resolvePlaceCategory, pickPrimaryGoogleType } from '../utils/googlePlaceCategory.js'
import { canUserDeletePlace, isPlaceOwner, isPlaceDeleteAdmin } from '../utils/placeOwnership.js'
import { festivalStatus, isFestivalPlace } from '../utils/festival.js'
import {
  processAlternativeRoutes,
  toRouteArray,
  hasMultipleRoutes,
  buildDirectRoute,
} from '../utils/routeHelpers.js'
import {
  osrmProfileFor,
  osrmProfileCandidates,
  buildTrainRoute,
  applyTravelModeToRoutes,
  routeNeedsPedestrianOrCycleRefetch,
  pickPrimaryRoute,
} from '../utils/travelModeRouting.js'

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
const CARTO_TILE_FALLBACK = 'https://a.basemaps.cartocdn.com/rastertiles/voyager'

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
    query('profile')
      .optional()
      .isIn(['driving', 'walking', 'cycling', 'bus', 'two_wheeler', 'train'])
      .withMessage('Invalid profile'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { start, end, profile = 'driving', waypoints, alternatives } = req.query
      const wantAlternatives = alternatives === 'true'

      const osrmProfile = osrmProfileFor(profile)

      // Validate coordinates (frontend sends lat,lng)
      const startCoords = start.split(',').map(Number)
      const endCoords = end.split(',').map(Number)

      if (startCoords.length !== 2 || endCoords.length !== 2) {
        return res.status(400).json({ error: 'Invalid coordinate format' })
      }

      const parsedWaypoints = waypoints
        ? waypoints.split(';').map((wp) => {
            const [lat, lng] = wp.split(',').map(Number)
            return { lat, lng }
          })
        : []

      let routeData = null

      if (profile === 'train') {
        routeData = buildTrainRoute(
          startCoords[0],
          startCoords[1],
          endCoords[0],
          endCoords[1],
          parsedWaypoints
        )
        console.log('🗺️  Route estimated for train (no OSRM transit graph)')
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
        const candidates = osrmProfileCandidates(profile)
        let lastError = null

        for (const candidateProfile of candidates) {
          const url = `${baseUrl.replace(/\/+$/, '')}/route/v1/${candidateProfile}/${coordinatesStr}`
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

          try {
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
              const parsed = routes.map(parseOsrmRoute).filter(Boolean).slice(0, 3)
              if (parsed.length) return parsed
            }
            const parsed = parseOsrmRoute(routes[0])
            if (parsed) return wantAlternatives ? [parsed] : parsed
          } catch (err) {
            lastError = err
          }
        }

        if (lastError) throw lastError
        return null
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
        const umnaProfile = osrmProfile || 'driving'
        const url = `${ROUTE_BASE_URL}/${umnaProfile}/${coordinatesStr}`
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
      if (!routeData) {
        try {
          routeData = await tryOsrm(ROUTE_SERVICE_URL)
          if (routeData) console.log('🗺️  Route from umnaapp.in/route')
        } catch (e) {
          console.warn('Route umnaapp.in/route failed:', e.message)
        }
      }

      // umnaapp often accepts walk/cycle profiles but returns driving speeds — refetch from public OSRM
      if (
        routeData &&
        (profile === 'walking' || profile === 'cycling') &&
        routeNeedsPedestrianOrCycleRefetch(pickPrimaryRoute(routeData), profile)
      ) {
        console.warn(`Route umnaapp ${profile} looks like driving — trying public OSRM`)
        routeData = null
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
          profile
        )
        routeData = wantAlternatives ? [fallback] : fallback
        primaryRoute = fallback
        console.warn('Route services unavailable — using direct fallback path')
      }

      const finalRoutes = applyTravelModeToRoutes(toRouteArray(routeData), profile)
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
    const viewerId = req.user.id

    const lat = params.lat != null ? parseFloat(params.lat) : null
    const lng = params.lng != null ? parseFloat(params.lng) : null
    const radiusKm = params.radiusKm != null ? parseFloat(params.radiusKm) : null

    const { results, providers, counts, upstreamError } = await unifiedTextSearch(q, {
      viewerId,
      limit: 15,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
    })

    console.log(
      `[search-simple] q="${q}" → local: ${counts.db}, osm-db: ${counts.osm}, ` +
        `http: ${counts.external}, merged: ${counts.merged}` +
        (providers.length ? ` | providers: ${providers.join('+')}` : '') +
        (upstreamError ? ` | upstream error: ${upstreamError.provider}: ${upstreamError.reason}` : '')
    )

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
      const displayName = result.display_name ?? result.name ?? ''
      const addressFields = await buildNormalizedAddressFields(result.address || {}, displayName)

      const address = {
        placeId: result.place_id,
        displayName,
        lat: parseFloat(result.lat) || parseFloat(lat),
        lng: parseFloat(result.lon ?? result.lng) || parseFloat(lng),
        address: result.address,
        addressFields,
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
  'Festival',
  'Other',
]

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
  const itemForDetails = {
    ...item,
    extracted_at: item.extracted_at ?? item.extractedAt ?? new Date().toISOString(),
  }
  const details = buildPlaceDetailFields(itemForDetails, {
    village: item.village,
    taluk: item.taluk,
    district: item.district,
    state: item.state,
    country: item.country,
  })
  const source = options.source || 'contribution'
  const zoomLevel = parseFloat(item.zoomLevel ?? item.zoom_level ?? 15)
  const resolvedCategory = resolvePlaceCategory({
    category: item.category,
    type: item.type,
    types: item.types ?? item.google_types ?? item.googleTypes ?? details.googleTypes,
    googleTypes: details.googleTypes,
    googleType: details.googleType,
    name,
  })
  const primaryGoogleType =
    pickPrimaryGoogleType(
      item.types ?? item.google_types ?? item.googleTypes ?? details.googleTypes,
      item.type ?? details.googleType
    ) || details.googleType

  return {
    name,
    placeNameEn: name,
    placeNameLocal: localName,
    category: resolvedCategory,
    latitude: lat,
    longitude: lng,
    zoomLevel: Number.isFinite(zoomLevel) ? zoomLevel : 15,
    userId,
    userName,
    userEmail,
    source: source === 'saved' ? 'saved' : 'contribution',
    ...initialApprovalFields(new Date(), { kind: 'extracted' }),
    ...details,
    googleType: primaryGoogleType || details.googleType,
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
    body('festival_start_date').optional({ nullable: true }).isISO8601().withMessage('Festival start date must be a valid date'),
    body('festival_end_date').optional({ nullable: true }).isISO8601().withMessage('Festival end date must be a valid date'),
    body('festival_recurrence').optional({ nullable: true }).isIn(['yearly', 'none']).withMessage('Recurrence must be yearly or none'),
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
          ...initialApprovalFields(new Date(), { kind: 'manual' }),
          ...detailFields,
        },
      })

      recordPlaceAuditAsync({
        placeId: place.id,
        action: PLACE_AUDIT_ACTIONS.CREATED,
        actor: userActor(req.user),
        after: place,
        note: isSaved ? 'Saved from search' : 'Place added',
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
    query('limit').optional().isInt({ min: 1, max: 5000 }).withMessage('limit 1-5000'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be >= 0'),
    query('minLat').optional().isFloat({ min: -90, max: 90 }),
    query('maxLat').optional().isFloat({ min: -90, max: 90 }),
    query('minLng').optional().isFloat({ min: -180, max: 180 }),
    query('maxLng').optional().isFloat({ min: -180, max: 180 }),
    query('includeOsm').optional().isIn(['true', 'false', '1', '0']),
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

      // Auto-approval & festival cleanup run on the 15-minute scheduler, not
      // during list/search/detail requests (see startPlaceApprovalScheduler).
      const viewerId = req.user.id

      const selectedCategories = String(req.query.categories || '')
        .split(',')
        .map((category) => category.trim())
        .filter(Boolean)

      const minLat = req.query.minLat != null ? parseFloat(req.query.minLat) : null
      const maxLat = req.query.maxLat != null ? parseFloat(req.query.maxLat) : null
      const minLng = req.query.minLng != null ? parseFloat(req.query.minLng) : null
      const maxLng = req.query.maxLng != null ? parseFloat(req.query.maxLng) : null

      const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : 5000
      const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : 0
      const includeOsm = req.query.includeOsm !== 'false' && req.query.includeOsm !== '0'

      const { places, availableCategories, counts } = await unifiedMapPlaces({
        viewerId,
        categories: selectedCategories,
        minLat,
        maxLat,
        minLng,
        maxLng,
        limit,
        offset,
        includeOsm,
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
          festival_start_date: p.festivalStartDate ?? null,
          festival_end_date: p.festivalEndDate ?? null,
          festival_recurrence: p.festivalRecurrence ?? null,
          festival: isFestivalPlace(p) ? festivalStatus(p) : null,
          isPersisted: p.isPersisted ?? true,
          isDbPlace: p.isDbPlace ?? Boolean(p.userId || isPersistedSource(p.source)),
        })
      )
      res.json({
        places: normalized,
        selectedCategories,
        limit,
        offset,
        returned: normalized.length,
        availableCategories,
        sources: {
          localDb: counts.db,
          osmDb: counts.osm,
          merged: counts.merged,
        },
      })
    } catch (error) {
      console.error('List places error:', error)
      res.status(500).json({ error: 'Failed to fetch places', message: error.message })
    }
  }
)

/**
 * @route GET /api/map/festivals/upcoming
 * @desc Festival / jatre markers sorted by their next occurrence, with countdowns.
 *       Active + upcoming within `withinDays` (default 365). Approved to everyone;
 *       a viewer also sees their own pending/rejected ones.
 * @access Private
 */
router.get(
  '/festivals/upcoming',
  authenticateToken,
  rateLimitMiddleware('festivals:upcoming', 60, 60),
  [query('withinDays').optional().isInt({ min: 1, max: 1830 })],
  async (req, res) => {
    try {
      if (!prisma.place) {
        return res.status(503).json({ error: 'Place model not available' })
      }
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      await autoApproveExpiredPendingPlaces()
      await removeExpiredFestivals()
      const viewerId = req.user.id
      const withinDays = parseInt(req.query.withinDays, 10) || 365

      const rows = await prisma.place.findMany({
        where: {
          AND: [
            placePublicVisibilityOr(viewerId),
            {
              OR: [
                { category: 'Festival' },
                { festivalStartDate: { not: null } },
              ],
            },
          ],
        },
        take: 1000,
        select: {
          id: true,
          name: true,
          placeNameEn: true,
          placeNameLocal: true,
          category: true,
          latitude: true,
          longitude: true,
          zoomLevel: true,
          village: true,
          taluk: true,
          district: true,
          state: true,
          fullAddress: true,
          source: true,
          userId: true,
          userName: true,
          approvalStatus: true,
          approvedAt: true,
          festivalStartDate: true,
          festivalEndDate: true,
          festivalRecurrence: true,
        },
      })

      const now = new Date()
      const festivals = rows
        .map((p) => {
          const status = festivalStatus(p, now)
          if (!status) return null
          return attachApprovalMeta({
            ...p,
            name: p.placeNameEn ?? p.name,
            place_name_en: p.placeNameEn ?? p.name,
            place_name_local: p.placeNameLocal,
            user_name: p.userName,
            full_address: p.fullAddress,
            festival_start_date: p.festivalStartDate ?? null,
            festival_end_date: p.festivalEndDate ?? null,
            festival_recurrence: p.festivalRecurrence ?? null,
            festival: status,
          })
        })
        .filter(Boolean)
        .filter((p) => p.festival.active || p.festival.daysUntilStart <= withinDays)
        .sort((a, b) => {
          if (a.festival.active !== b.festival.active) return a.festival.active ? -1 : 1
          return a.festival.daysUntilStart - b.festival.daysUntilStart
        })

      res.json({ festivals, count: festivals.length })
    } catch (error) {
      console.error('Upcoming festivals error:', error)
      res.status(500).json({ error: 'Failed to fetch festivals', message: error.message })
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

      const categoryRaw = String(req.body.category || '').trim()
      const viewerId = req.user.id

      let dbInside = await findInPolygonPostgis({ ring, viewerId, limit: 2500 })

      if (!dbInside) {
        const lats = ring.map((c) => c[1])
        const lngs = ring.map((c) => c[0])
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)

        const candidates = await prisma.place.findMany({
          where: {
            AND: [
              placePublicVisibilityOr(viewerId),
              { latitude: { gte: minLat, lte: maxLat } },
              { longitude: { gte: minLng, lte: maxLng } },
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
            googleType: true,
            googleTypes: true,
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

        dbInside = candidates.filter((p) => pointInRing(p.longitude, p.latitude, ring))
      }

      const inside = await unifiedInPolygon({
        ring,
        viewerId,
        category: categoryRaw || null,
        findInPolygonPostgis: async () => dbInside,
      })

      const categoryMatched = categoryRaw
        ? inside.filter((p) => {
            if (p.source === 'osm') return String(p.category) === categoryRaw
            const resolved = resolvePlaceCategory({
              category: p.category,
              type: p.googleType,
              types: Array.isArray(p.googleTypes) ? p.googleTypes : null,
              googleType: p.googleType,
              googleTypes: p.googleTypes,
              name: p.placeNameEn ?? p.name,
            })
            return resolved === categoryRaw
          })
        : inside

      const normalized = categoryMatched.map((p) =>
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

      const looksLikeExtractBatch = incoming.some(
        (item) => item.extracted_at || item.extractedAt || item.place_id || item.placeId
      )
      if (looksLikeExtractBatch) {
        const extractRow = await prisma.user.findUnique({
          where: { id: userId },
          select: { lastGridExtractAt: true },
        })
        if (!usedGridExtractToday(extractRow?.lastGridExtractAt)) {
          return res.status(429).json({
            error: 'EXTRACT_DAILY_LIMIT',
            message: 'Start place extract from the Extract panel before adding extracted places (once per day).',
            usedToday: false,
          })
        }
      }

      // Scope duplicate detection to a bounding box around the incoming places
      // instead of scanning the whole table (bulk/extract is clustered).
      const dupIndex = await PlaceDuplicateIndex.loadNear(prisma, incoming)
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
          recordPlaceAuditAsync({
            placeId: place.id,
            action: PLACE_AUDIT_ACTIONS.CREATED,
            actor: userActor(req.user),
            after: place,
            note: 'Extracted place added',
          })
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
 * @route GET /api/map/places/pick
 * @desc Resolve the best place at a map click (user DB place or OSM feature)
 * @access Private
 */
router.get(
  '/places/pick',
  authenticateToken,
  rateLimitMiddleware('places:pick', 120, 60),
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
    query('radiusMeters').optional().isInt({ min: 100, max: 8000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      const lat = parseFloat(req.query.lat)
      const lng = parseFloat(req.query.lng)
      const radiusMeters = req.query.radiusMeters != null
        ? parseInt(req.query.radiusMeters, 10)
        : 2500

      const picked = await unifiedPickAtPoint({
        lat,
        lng,
        radiusMeters,
        viewerId: req.user.id,
        findNearbyPostgis,
        placePublicVisibilityOrFn: placePublicVisibilityOr,
      })

      if (!picked) {
        return res.status(404).json({ error: 'No place found at this location' })
      }

      if (isOsmPlaceId(picked.id)) {
        const detailed = await unifiedPlaceById(picked.id)
        return res.json({
          place: attachApprovalMeta(serializeOsmPlace(detailed || picked)),
        })
      }

      if (picked.isDbPlace || picked.isPersisted || isPersistedSource(picked.source)) {
        return res.json({
          place: attachApprovalMeta(serializePlace(picked)),
        })
      }

      return res.json({
        place: attachApprovalMeta(serializeOsmPlace(picked)),
      })
    } catch (error) {
      res.status(500).json({ error: 'Failed to pick place', message: error.message })
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
        select: PLACE_DETAIL_SELECT,
      })

      if (!place) {
        return res.status(404).json({ error: 'Place not found' })
      }

      if (!canUserDeletePlace(place, req.user)) {
        return res.status(403).json({ error: 'Not authorized to delete this place' })
      }

      await prisma.place.delete({ where: { id: id.trim() } })

      recordPlaceAuditAsync({
        placeId: place.id,
        action: PLACE_AUDIT_ACTIONS.DELETED,
        actor: userActor(req.user),
        before: place,
        note: req.user?.id === place.userId ? 'Deleted by owner' : 'Deleted by admin',
      })

      res.json({ success: true, id: id.trim() })
    } catch (error) {
      console.error('Delete place error:', error)
      res.status(500).json({ error: 'Failed to delete place', message: error.message })
    }
  }
)

/**
 * @route PATCH /api/map/places/:id
 * @desc Edit a place. Only the place owner (or a configured place admin) may
 *       edit. Performs duplicate detection (excluding the place itself),
 *       records an audit entry with the field-level diff, and only updates the
 *       fields actually sent in the body — existing Google / detail columns are
 *       never wiped by a partial edit. Backward compatible (additive route).
 * @access Private
 */
router.patch(
  '/places/:id',
  authenticateToken,
  rateLimitMiddleware('places:update', 30, 60),
  [
    body('place_name_en').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Place name (English) 1-200 chars'),
    body('place_name_local').optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage('Local name max 200 chars'),
    body('category').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Category 1-50 chars'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('zoomLevel').optional().isFloat({ min: 0, max: 22 }).withMessage('Zoom level 0-22'),
    body('approvalStatus').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid approval status'),
    body('festival_start_date').optional({ nullable: true }).isISO8601().withMessage('Festival start date must be a valid date'),
    body('festival_end_date').optional({ nullable: true }).isISO8601().withMessage('Festival end date must be a valid date'),
    body('festival_recurrence').optional({ nullable: true }).isIn(['yearly', 'none']).withMessage('Recurrence must be yearly or none'),
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

      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'Place ID required' })

      const existing = await prisma.place.findUnique({ where: { id } })
      if (!existing) return res.status(404).json({ error: 'Place not found' })

      const isAdmin = isPlaceDeleteAdmin(req.user)
      const isOwner = isPlaceOwner(existing, req.user)
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Not authorized to edit this place' })
      }

      // Duplicate detection — only when an identity field (name / coords /
      // google id) changes. Always exclude the place being edited.
      const identityChanged =
        req.body.place_name_en != null ||
        req.body.latitude != null ||
        req.body.longitude != null ||
        req.body.google_place_id != null ||
        req.body.place_id != null ||
        req.body.placeId != null
      if (identityChanged) {
        const dupPayload = {
          place_name_en: req.body.place_name_en ?? existing.placeNameEn ?? existing.name,
          latitude: req.body.latitude ?? existing.latitude,
          longitude: req.body.longitude ?? existing.longitude,
          village: req.body.village ?? existing.village,
          taluk: req.body.taluk ?? existing.taluk,
          district: req.body.district ?? existing.district,
          state: req.body.state ?? existing.state,
          country: req.body.country ?? existing.country,
          pincode: req.body.pincode ?? existing.pincode,
          place_id: req.body.place_id ?? req.body.placeId ?? req.body.google_place_id ?? existing.googlePlaceId,
        }
        const dup = await findPlaceDuplicate(prisma, dupPayload, { excludePlaceId: id })
        if (dup.duplicate) {
          return res.status(409).json({
            error: 'Duplicate place',
            reason: dup.reason,
            message: dup.message,
            existingPlaceId: dup.existingPlaceId,
            existingPlaceName: dup.existingPlaceName,
          })
        }
      }

      const addressCtx = {
        village: req.body.village ?? existing.village,
        taluk: req.body.taluk ?? existing.taluk,
        district: req.body.district ?? existing.district,
        state: req.body.state ?? existing.state,
        country: req.body.country ?? existing.country,
        pincode: req.body.pincode ?? existing.pincode,
      }

      const data = {}
      if (req.body.place_name_en) {
        const rawName = String(req.body.place_name_en).trim()
        data.placeNameEn = sanitizePlaceName(rawName, addressCtx) || rawName
        data.name = data.placeNameEn
      }
      if (req.body.place_name_local !== undefined) {
        data.placeNameLocal = sanitizePlaceName(req.body.place_name_local, addressCtx)
      }
      if (req.body.category) data.category = String(req.body.category).trim()
      if (req.body.latitude != null) data.latitude = parseFloat(req.body.latitude)
      if (req.body.longitude != null) data.longitude = parseFloat(req.body.longitude)
      if (req.body.zoomLevel != null) data.zoomLevel = parseFloat(req.body.zoomLevel)

      // Plain detail fields: only update the ones actually present in the body
      // so a partial edit never nulls existing columns (Google data, etc.).
      const DETAIL_ALIASES = {
        fullAddress: ['full_address', 'fullAddress', 'address'],
        vicinity: ['vicinity'],
        village: ['village'],
        taluk: ['taluk'],
        district: ['district'],
        state: ['state'],
        country: ['country'],
        pincode: ['pincode'],
        phone: ['phone'],
        website: ['website'],
        description: ['description'],
      }
      for (const [field, aliases] of Object.entries(DETAIL_ALIASES)) {
        const alias = aliases.find((a) => req.body[a] !== undefined)
        if (alias !== undefined) {
          const raw = req.body[alias]
          const trimmed = raw == null ? '' : String(raw).trim()
          data[field] = trimmed === '' ? null : trimmed.slice(0, field === 'fullAddress' ? 2000 : 500)
        }
      }

      if (req.body.mapRenderingConfig !== undefined || req.body.map_rendering_config !== undefined) {
        const built = buildPlaceDetailFields(
          { mapRenderingConfig: req.body.mapRenderingConfig ?? req.body.map_rendering_config, zoomLevel: data.zoomLevel ?? existing.zoomLevel },
          {},
          { forUpdate: true }
        )
        data.mapRenderingConfig = built.mapRenderingConfig
      }

      // Festival window edits (only if any festival key present)
      if (
        req.body.festival_start_date !== undefined ||
        req.body.festival_end_date !== undefined ||
        req.body.festival_recurrence !== undefined
      ) {
        const fest = buildPlaceDetailFields(req.body, {}, { forUpdate: true })
        data.festivalStartDate = fest.festivalStartDate
        data.festivalEndDate = fest.festivalEndDate
        data.festivalRecurrence = fest.festivalRecurrence
      }

      // Approval workflow: only admins may directly change approval status.
      let note = isOwner && !isAdmin ? 'Edited by owner' : 'Edited by admin'
      let action = PLACE_AUDIT_ACTIONS.UPDATED
      let approvedJustNow = false
      if (isAdmin && req.body.approvalStatus) {
        data.approvalStatus = req.body.approvalStatus
        if (req.body.approvalStatus === 'approved') {
          data.approvedAt = new Date()
          data.autoApproveAt = null
          if (existing.approvalStatus !== 'approved') {
            action = PLACE_AUDIT_ACTIONS.APPROVED
            note = 'Approved by admin'
            approvedJustNow = true
          }
        } else if (req.body.approvalStatus === 'rejected') {
          data.approvedAt = null
          data.autoApproveAt = null
          if (existing.approvalStatus !== 'rejected') {
            action = PLACE_AUDIT_ACTIONS.REJECTED
            note = 'Rejected by admin'
          }
        } else if (req.body.approvalStatus === 'pending') {
          data.approvedAt = null
        }
      }

      const place = await prisma.place.update({ where: { id }, data })

      const changes = computeChanges(existing, place)
      if (Object.keys(changes).length > 0) {
        recordPlaceAuditAsync({
          placeId: place.id,
          action,
          actor: userActor(req.user),
          before: existing,
          after: place,
          changesOverride: changes,
          note,
        })
      }

      if (approvedJustNow) {
        onPlaceApproved(place, { approvedBy: 'admin' }).catch((err) => {
          console.error('[notify] onPlaceApproved bg error:', err)
        })
      }

      res.json(attachApprovalMeta(serializePlace(place)))
    } catch (error) {
      console.error('Update place error:', error)
      res.status(500).json({ error: 'Failed to update place', message: error.message })
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
      if (isOsmPlaceId(id)) {
        const osmPlace = await unifiedPlaceById(id)
        if (!osmPlace) return res.status(404).json({ error: 'Place not found' })
        return res.json(attachApprovalMeta(serializeOsmPlace(osmPlace)))
      }
      // Auto-approval runs on the 15-minute scheduler, not during place detail.
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
 * @route GET /api/map/places/:id/history
 * @desc Public provenance / audit trail for a place (Wikipedia-style transparency)
 * @access Private (visible to all signed-in users for approved/deleted places;
 *         pending/rejected places remain visible only to their contributor)
 */
router.get(
  '/places/:id/history',
  authenticateToken,
  rateLimitMiddleware('places:history', 120, 60),
  async (req, res) => {
    try {
      const { id } = req.params
      const place = await prisma.place.findUnique({
        where: { id },
        select: { id: true, userId: true, approvalStatus: true },
      })
      // If the place still exists, honour normal visibility rules. If it was
      // deleted, its history stays publicly viewable for accountability.
      if (place && !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      const history = await getPlaceHistory(id, { includeSnapshot: false })
      res.json({ placeId: id, deleted: !place, history })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch place history', message: error.message })
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

      if (isOsmPlaceId(id)) {
        let osmPlace = await unifiedPlaceById(id)
        if (!osmPlace) {
          const qLat = parseFloat(req.query.lat)
          const qLng = parseFloat(req.query.lng)
          if (Number.isFinite(qLat) && Number.isFinite(qLng)) {
            osmPlace = { id, latitude: qLat, longitude: qLng }
          }
        }
        if (!osmPlace) return res.status(404).json({ error: 'Place not found' })
        const nearby = await unifiedNearby({
          lat: osmPlace.latitude,
          lng: osmPlace.longitude,
          radiusMeters: 2000,
          excludeId: id,
          limit: 8,
          findNearbyPostgis,
          placePublicVisibilityOrFn: placePublicVisibilityOr,
          viewerId: req.user.id,
        })
        return res.json(
          nearby.map((p) => ({
            ...p,
            name: p.placeNameEn ?? p.name,
            place_name_en: p.placeNameEn ?? p.name,
          }))
        )
      }

      // Auto-approval runs on the 15-minute scheduler, not during place detail.
      const place = await prisma.place.findUnique({
        where: { id },
        select: { latitude: true, longitude: true, category: true, userId: true, approvalStatus: true },
      })
      if (!place) return res.status(404).json({ error: 'Place not found' })
      if (!isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }

      const nearby = await unifiedNearby({
        lat: place.latitude,
        lng: place.longitude,
        radiusMeters: 2000,
        excludeId: id,
        limit: 8,
        findNearbyPostgis,
        placePublicVisibilityOrFn: placePublicVisibilityOr,
        viewerId: req.user.id,
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
 * Business ownership claims.
 *
 * A user submits a claim ("I own / manage this business"); an admin later
 * approves or rejects it from the admin panel. On approval the Place is
 * stamped with claimedById + claimVerifiedAt, which drives the "verified
 * owner" badge in the UI.
 */

const CLAIM_ROLES = ['owner', 'manager', 'employee', 'other']

/**
 * @route GET /api/map/places/:id/claim
 * @desc Get the current user's claim status for a place (+ whether it's verified)
 * @access Private
 */
router.get(
  '/places/:id/claim',
  authenticateToken,
  rateLimitMiddleware('claims:get', 120, 60),
  async (req, res) => {
    try {
      const place = await prisma.place.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, approvalStatus: true, claimedById: true, claimVerifiedAt: true },
      })
      if (!place || !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      const verified = Boolean(place.claimVerifiedAt)
      if (!prisma.businessClaim) {
        return res.json({ claim: null, verified, claimedByMe: place.claimedById === req.user.id })
      }
      const claim = await prisma.businessClaim.findUnique({
        where: { placeId_userId: { placeId: req.params.id, userId: req.user.id } },
        select: { id: true, role: true, status: true, message: true, reviewNote: true, createdAt: true, reviewedAt: true },
      })
      res.json({ claim: claim || null, verified, claimedByMe: place.claimedById === req.user.id })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch claim', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/places/:id/claim
 * @desc Submit (or re-submit) a business ownership claim for a place
 * @access Private
 */
router.post(
  '/places/:id/claim',
  authenticateToken,
  rateLimitMiddleware('claims:create', 10, 60),
  [
    body('role').optional().isIn(CLAIM_ROLES).withMessage(`Role must be one of: ${CLAIM_ROLES.join(', ')}`),
    body('contactPhone').optional().trim().isLength({ max: 30 }).withMessage('Phone too long'),
    body('contactEmail').optional().trim().isEmail().withMessage('Valid email required').isLength({ max: 200 }),
    body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message max 1000 chars'),
  ],
  async (req, res) => {
    try {
      if (!prisma.businessClaim) {
        return res.status(503).json({ error: 'Business claims not available. Run migration: add-phase7-claims-labels.sql, then `npx prisma generate` and restart.' })
      }
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const place = await prisma.place.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, approvalStatus: true, claimedById: true, claimVerifiedAt: true },
      })
      if (!place || !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      if (place.claimVerifiedAt && place.claimedById && place.claimedById !== req.user.id) {
        return res.status(409).json({ error: 'This business has already been claimed by another user.' })
      }

      const { role, contactPhone, contactEmail, message } = req.body
      const data = {
        userName: req.user.name || null,
        role: role || 'owner',
        contactPhone: contactPhone?.trim() || null,
        contactEmail: contactEmail?.trim() || req.user.email || null,
        message: message?.trim() || null,
        status: 'pending',
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
      }
      const claim = await prisma.businessClaim.upsert({
        where: { placeId_userId: { placeId: req.params.id, userId: req.user.id } },
        create: { placeId: req.params.id, userId: req.user.id, ...data },
        update: data,
        select: { id: true, role: true, status: true, message: true, createdAt: true },
      })
      res.status(201).json({ claim })
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit claim', message: error.message })
    }
  }
)

/**
 * Personal place labels (Google Maps "Add a label"). Private per-user.
 */

/**
 * @route GET /api/map/places/:id/label
 * @desc Get the current user's label for a place
 * @access Private
 */
router.get(
  '/places/:id/label',
  authenticateToken,
  rateLimitMiddleware('labels:get', 200, 60),
  async (req, res) => {
    try {
      if (!prisma.placeLabel) return res.json({ label: null })
      const row = await prisma.placeLabel.findUnique({
        where: { userId_placeId: { userId: req.user.id, placeId: req.params.id } },
        select: { id: true, label: true, updatedAt: true },
      })
      res.json({ label: row || null })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch label', message: error.message })
    }
  }
)

/**
 * @route PUT /api/map/places/:id/label
 * @desc Create / update the current user's personal label for a place
 * @access Private
 */
router.put(
  '/places/:id/label',
  authenticateToken,
  rateLimitMiddleware('labels:set', 60, 60),
  [body('label').isString().trim().isLength({ min: 1, max: 60 }).withMessage('Label must be 1-60 chars')],
  async (req, res) => {
    try {
      if (!prisma.placeLabel) {
        return res.status(503).json({ error: 'Labels not available. Run migration: add-phase7-claims-labels.sql, then `npx prisma generate` and restart.' })
      }
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const place = await prisma.place.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true, approvalStatus: true, latitude: true, longitude: true },
      })
      if (!place || !isPlaceVisibleToUser(place, req.user.id)) {
        return res.status(404).json({ error: 'Place not found' })
      }
      const label = req.body.label.trim()
      const row = await prisma.placeLabel.upsert({
        where: { userId_placeId: { userId: req.user.id, placeId: req.params.id } },
        create: { userId: req.user.id, placeId: req.params.id, label, latitude: place.latitude, longitude: place.longitude },
        update: { label },
        select: { id: true, label: true, updatedAt: true },
      })
      res.json({ label: row })
    } catch (error) {
      res.status(500).json({ error: 'Failed to save label', message: error.message })
    }
  }
)

/**
 * @route DELETE /api/map/places/:id/label
 * @desc Remove the current user's personal label for a place
 * @access Private
 */
router.delete(
  '/places/:id/label',
  authenticateToken,
  rateLimitMiddleware('labels:delete', 60, 60),
  async (req, res) => {
    try {
      if (!prisma.placeLabel) return res.json({ success: true })
      await prisma.placeLabel.deleteMany({ where: { userId: req.user.id, placeId: req.params.id } })
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete label', message: error.message })
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
      console.error('PlaceFinder error:', error)
      res.status(500).json({ error: 'PlaceFinder failed', message: error.message })
    }
  }
)

/**
 * @route POST /api/map/assistant
 * @desc Support chatbot for UmnaApp Maps features (Groq chat, topic-restricted).
 *       Public so it can be used on the landing page before login.
 * @access Public
 */
router.post(
  '/assistant',
  optionalAuth,
  // Per-minute burst limit: signed-in users get a higher cap than anonymous.
  tieredRateLimitMiddleware('map:assistant', { authMax: 30, anonMax: 12, windowSeconds: 60 }),
  // Daily usage cap to deter abuse of the public LLM endpoint.
  tieredRateLimitMiddleware('map:assistant:daily', { authMax: 400, anonMax: 80, windowSeconds: 86400 }),
  [
    body('messages').isArray({ min: 1, max: 30 }).withMessage('messages must be a non-empty array'),
    body('messages.*.role').optional().isIn(['user', 'assistant']),
    body('messages.*.content').isString().trim().isLength({ min: 1, max: 1500 }),
    body('context').optional().isObject(),
    body('context.lat').optional().isFloat({ min: -90, max: 90 }),
    body('context.lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const result = await runMapAssistant(req.body.messages, { context: req.body.context || null })
      res.json(result)
    } catch (error) {
      console.error('Map Assistant error:', error)
      res.status(500).json({ error: 'Assistant failed', message: error.message })
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
      maxAreaKm2: EXTRACT_MAX_AREA_KM2,
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
      maxAreaKm2: EXTRACT_MAX_AREA_KM2,
      lastExtractAt: row?.lastGridExtractAt ?? null,
    })
  } catch (error) {
    console.error('grid-extract status error:', error)
    res.status(500).json({ error: 'Failed to load grid extract status' })
  }
})

/**
 * @route POST /api/map/grid-extract/release
 * @desc Return today's grid extract slot when a run found zero places (one retry same day)
 */
router.post('/grid-extract/release', authenticateToken, async (req, res) => {
  try {
    const row = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { lastGridExtractAt: true },
    })
    if (!usedGridExtractToday(row?.lastGridExtractAt)) {
      return res.json({ ok: true, released: false })
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { lastGridExtractAt: null },
    })
    res.json({ ok: true, released: true })
  } catch (error) {
    console.error('grid-extract release error:', error)
    res.status(500).json({ error: 'Failed to release grid extract slot' })
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
        error: 'EXTRACT_DAILY_LIMIT',
        message: 'You have already used place extract today. You can extract again tomorrow.',
        usedToday: true,
        maxPlaces: GRID_EXTRACT_MAX_PLACES,
        maxAreaKm2: EXTRACT_MAX_AREA_KM2,
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
      maxAreaKm2: EXTRACT_MAX_AREA_KM2,
      lastExtractAt: updated.lastGridExtractAt,
    })
  } catch (error) {
    console.error('grid-extract consume error:', error)
    res.status(500).json({ error: 'Failed to start grid extract' })
  }
})

export default router
