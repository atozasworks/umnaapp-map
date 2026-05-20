/**
 * Server-side defaults for Google Places client quota optimization.
 * Served via GET /api/map/config so limits can be tuned without redeploying the frontend.
 */

function intEnv(name, fallback) {
  const n = parseInt(process.env[name], 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function boolEnv(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  const lower = String(v).trim().toLowerCase()
  return lower === 'true' || lower === '1' || lower === 'yes'
}

export function getPlacesQuotaConfig() {
  return {
    googleApiHardStop: boolEnv('GOOGLE_API_HARD_STOP', true),
    minZoomForNearbySearch: intEnv('PLACES_MIN_ZOOM_NEARBY', 14),
    maxNearbySearchPerSession: intEnv('PLACES_MAX_NEARBY_PER_SESSION', 120),
    maxNearbySearchPerDay: intEnv('PLACES_MAX_NEARBY_PER_DAY', 400),
    boundsCacheMaxEntries: intEnv('PLACES_BOUNDS_CACHE_MAX', 200),
    boundsCacheTtlMs: intEnv('PLACES_BOUNDS_CACHE_TTL_MS', 30 * 60 * 1000),
    placeDetailsCacheMaxEntries: intEnv('PLACES_DETAILS_CACHE_MAX', 500),
    placeDetailsCacheTtlMs: intEnv('PLACES_DETAILS_CACHE_TTL_MS', 60 * 60 * 1000),
    mapIdleDebounceMs: intEnv('PLACES_MAP_IDLE_DEBOUNCE_MS', 400),
    boundsPrecision: intEnv('PLACES_BOUNDS_PRECISION', 4),
    minDelayBetweenCalls: intEnv('PLACES_MIN_DELAY_MS', 350),
    cellDelay: intEnv('PLACES_CELL_DELAY_MS', 800),
  }
}
