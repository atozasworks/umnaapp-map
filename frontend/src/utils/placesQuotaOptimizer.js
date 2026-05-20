/**
 * Google Places API quota optimization: session limits, bounds cache,
 * place_id details cache, zoom gates, and map idle/debounce helpers.
 */

import {
  initGoogleApiQuota,
  getGoogleApiQuota,
  canUseGoogleApi,
  assertGoogleApiAvailable,
  recordGoogleApiUse,
  subscribeGoogleApiQuota,
  getGoogleApiQuotaStatus,
  QUOTA_EXHAUSTED_MESSAGE_DAILY,
} from './googleApiQuota'

export {
  initGoogleApiQuota,
  getGoogleApiQuota,
  canUseGoogleApi,
  assertGoogleApiAvailable,
  recordGoogleApiUse,
  subscribeGoogleApiQuota,
  getGoogleApiQuotaStatus,
  QUOTA_EXHAUSTED_MESSAGE_DAILY,
}

export const DEFAULT_PLACES_QUOTA_CONFIG = {
  googleApiHardStop: true,
  minZoomForNearbySearch: 14,
  maxNearbySearchPerSession: 120,
  maxNearbySearchPerDay: 400,
  boundsCacheMaxEntries: 200,
  boundsCacheTtlMs: 30 * 60 * 1000,
  placeDetailsCacheMaxEntries: 500,
  placeDetailsCacheTtlMs: 60 * 60 * 1000,
  mapIdleDebounceMs: 400,
  boundsPrecision: 4,
}

/** Merge server config over defaults. */
const NUMERIC_CONFIG_KEYS = [
  ...Object.keys(DEFAULT_PLACES_QUOTA_CONFIG),
  'minDelayBetweenCalls',
  'cellDelay',
]

export function mergePlacesQuotaConfig(serverConfig = {}) {
  const merged = { ...DEFAULT_PLACES_QUOTA_CONFIG }
  if (typeof serverConfig.googleApiHardStop === 'boolean') {
    merged.googleApiHardStop = serverConfig.googleApiHardStop
  }
  for (const key of NUMERIC_CONFIG_KEYS) {
    const v = serverConfig[key]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      merged[key] = v
    }
  }
  return merged
}

function roundCoord(n, precision) {
  const f = 10 ** precision
  return Math.round(n * f) / f
}

/** Stable cache key for a LatLngBounds + place type. */
export function boundsCacheKey(bounds, placeType = '', precision = 4) {
  if (!bounds) return ''
  const ne = bounds.getNorthEast?.() ?? bounds.northeast
  const sw = bounds.getSouthWest?.() ?? bounds.southwest
  if (!ne || !sw) return ''

  const neLat = typeof ne.lat === 'function' ? ne.lat() : ne.lat
  const neLng = typeof ne.lng === 'function' ? ne.lng() : ne.lng
  const swLat = typeof sw.lat === 'function' ? sw.lat() : sw.lat
  const swLng = typeof sw.lng === 'function' ? sw.lng() : sw.lng

  return [
    roundCoord(neLat, precision),
    roundCoord(neLng, precision),
    roundCoord(swLat, precision),
    roundCoord(swLng, precision),
    placeType || '',
  ].join('|')
}

export function getMapZoom(map) {
  const z = map?.getZoom?.()
  return typeof z === 'number' && Number.isFinite(z) ? z : null
}

export function isZoomSufficient(map, minZoom = DEFAULT_PLACES_QUOTA_CONFIG.minZoomForNearbySearch) {
  const z = getMapZoom(map)
  if (z == null) return true
  return z >= minZoom
}

/** LRU-ish cache with TTL for nearbySearch results. */
export class BoundsSearchCache {
  constructor({ maxEntries = 200, ttlMs = 30 * 60 * 1000, precision = 4 } = {}) {
    this.maxEntries = maxEntries
    this.ttlMs = ttlMs
    this.precision = precision
    this._map = new Map()
    this.hits = 0
    this.misses = 0
  }

  get(bounds, placeType) {
    const key = boundsCacheKey(bounds, placeType, this.precision)
    if (!key) return null
    const entry = this._map.get(key)
    if (!entry) {
      this.misses++
      return null
    }
    if (Date.now() - entry.ts > this.ttlMs) {
      this._map.delete(key)
      this.misses++
      return null
    }
    this.hits++
    this._touch(key, entry)
    return entry.value
  }

  set(bounds, placeType, value) {
    const key = boundsCacheKey(bounds, placeType, this.precision)
    if (!key) return
    if (this._map.has(key)) this._map.delete(key)
    while (this._map.size >= this.maxEntries) {
      const oldest = this._map.keys().next().value
      this._map.delete(oldest)
    }
    this._map.set(key, { value, ts: Date.now() })
  }

  _touch(key, entry) {
    this._map.delete(key)
    this._map.set(key, entry)
  }

  clear() {
    this._map.clear()
    this.hits = 0
    this.misses = 0
  }
}

/** TTL cache for getDetails by place_id. */
export class PlaceDetailsCache {
  constructor({ maxEntries = 500, ttlMs = 60 * 60 * 1000 } = {}) {
    this.maxEntries = maxEntries
    this.ttlMs = ttlMs
    this._map = new Map()
    this.hits = 0
    this.misses = 0
  }

  get(placeId) {
    if (!placeId) return null
    const entry = this._map.get(placeId)
    if (!entry) {
      this.misses++
      return null
    }
    if (Date.now() - entry.ts > this.ttlMs) {
      this._map.delete(placeId)
      this.misses++
      return null
    }
    this.hits++
    this._map.delete(placeId)
    this._map.set(placeId, entry)
    return entry.value
  }

  set(placeId, details) {
    if (!placeId || !details) return
    if (this._map.has(placeId)) this._map.delete(placeId)
    while (this._map.size >= this.maxEntries) {
      const oldest = this._map.keys().next().value
      this._map.delete(oldest)
    }
    this._map.set(placeId, { value: details, ts: Date.now() })
  }

  clear() {
    this._map.clear()
    this.hits = 0
    this.misses = 0
  }
}

/** @deprecated Use GoogleApiQuotaGuard via initGoogleApiQuota / getGoogleApiQuota */
export class NearbySearchQuota {
  constructor(config, userId) {
    const guard = initGoogleApiQuota(config, userId)
    return guard
  }
}

/**
 * Debounce map drag/zoom; invoke callback only on `idle` (never during continuous pan).
 * Returns cleanup function.
 */
export function attachMapIdleGuard(map, { debounceMs = 400, onIdle, onZoomChange } = {}) {
  if (!map || !window.google?.maps?.event) return () => {}

  let debounceTimer = null
  let pendingIdle = false

  const runIdle = () => {
    pendingIdle = false
    onIdle?.({
      zoom: getMapZoom(map),
      bounds: map.getBounds?.() ?? null,
    })
  }

  const scheduleIdle = () => {
    pendingIdle = true
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      if (pendingIdle) runIdle()
    }, debounceMs)
  }

  const listeners = [
    map.addListener('dragstart', () => {
      pendingIdle = false
    }),
    map.addListener('dragend', scheduleIdle),
    map.addListener('zoom_changed', () => {
      onZoomChange?.(getMapZoom(map))
      scheduleIdle()
    }),
  ]

  const idleListener = map.addListener('idle', () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    runIdle()
  })

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    listeners.forEach((l) => window.google.maps.event.removeListener(l))
    window.google.maps.event.removeListener(idleListener)
  }
}

/**
 * Factory: all quota tools for one extract panel instance.
 */
export function createPlacesQuotaToolkit(config, userId) {
  const quota = initGoogleApiQuota(config, userId)
  const boundsCache = new BoundsSearchCache({
    maxEntries: config.boundsCacheMaxEntries,
    ttlMs: config.boundsCacheTtlMs,
    precision: config.boundsPrecision,
  })
  const detailsCache = new PlaceDetailsCache({
    maxEntries: config.placeDetailsCacheMaxEntries,
    ttlMs: config.placeDetailsCacheTtlMs,
  })

  return { config, quota, boundsCache, detailsCache }
}

export const SKIP_STATUS = {
  ZOOM_TOO_LOW: 'ZOOM_TOO_LOW',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CACHE_HIT: 'CACHE_HIT',
}

/** Pre-flight check for any Google SDK call; blocks before network when exhausted. */
export function guardGoogleApiRequest(apiType) {
  return assertGoogleApiAvailable(apiType)
}
