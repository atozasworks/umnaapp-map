import axios from 'axios'

const SEARCH_SIMPLE_URL = (process.env.SEARCH_SIMPLE_URL || 'https://umnaapp.in/search').trim().replace(/\/+$/, '')
const NOMINATIM_URL = (process.env.NOMINATIM_URL || '').trim().replace(/\/+$/, '')
const UMNAAPP_NOMINATIM_SEARCH = (process.env.UMNAAPP_NOMINATIM_SEARCH || 'https://umnaapp.in/map/nominatim/search').trim().replace(/\/+$/, '')
const SEARCH_SIMPLE_TIMEOUT = parseInt(process.env.SEARCH_SIMPLE_TIMEOUT, 10) || 20000
const SEARCH_SIMPLE_RETRIES = parseInt(process.env.SEARCH_SIMPLE_RETRIES, 10) || 3
const USE_UMNAAPP_NOMINATIM =
  String(process.env.UMNAAPP_NOMINATIM_ENABLED || '').toLowerCase() === 'true'

// Public OpenStreetMap Nominatim. Enabled by default so place search always has
// global OSM coverage merged alongside umnaapp.in results. Set
// OSM_NOMINATIM_ENABLED=false to disable. Respect the OSM usage policy: a real
// User-Agent is sent and request volume is modest.
const OSM_NOMINATIM_URL = (process.env.OSM_NOMINATIM_URL || 'https://nominatim.openstreetmap.org')
  .trim()
  .replace(/\/+$/, '')
const USE_OSM_NOMINATIM =
  String(process.env.OSM_NOMINATIM_ENABLED ?? 'true').toLowerCase() !== 'false'
const OSM_USER_AGENT =
  process.env.OSM_USER_AGENT || 'UMNAAPP-Map-Platform/1.0 (https://umnaapp.in; support@umnaapp.in)'

/** umnaapp.in/search flat fields → Nominatim-style address for subtitles */
export function normalizeSearchRowAddress(row) {
  if (!row || typeof row !== 'object') return row
  if (row.address && typeof row.address === 'object' && !Array.isArray(row.address)) {
    return row
  }
  const taluk = row.taluk ?? row.tehsil
  const district = row.district ?? row.county
  const state = row.state
  if (!taluk && !district && !state) return row
  return {
    ...row,
    address: {
      municipality: taluk || undefined,
      subdistrict: taluk || undefined,
      county: district || undefined,
      state_district: district || undefined,
      state: state || undefined,
    },
  }
}

/** Retry axios request on timeout, network, or server (5xx) errors */
export async function axiosWithRetry(fn, { maxRetries = 3 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const networkErr =
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ENETUNREACH'
      const serverErr = err.response && err.response.status >= 500 && err.response.status < 600
      if ((!networkErr && !serverErr) || attempt >= maxRetries) throw err
      const delay = attempt * 500
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

/**
 * Query the geocoders in parallel and merge results.
 *
 * Sources:
 *   1. umnaapp.in/search                 — simple { name, lat, lon } search
 *   2. nominatim.openstreetmap.org       — public OpenStreetMap (on by default)
 *   3. umnaapp.in/map/nominatim/...      — optional (off by default; service is down on VPS)
 *   4. NOMINATIM_URL/search              — optional extra self-hosted Nominatim (if env set)
 */
export async function searchExternalProviders(q, { limit = 10, lat, lng, radiusKm } = {}) {
  const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng)
  const providers = [
    {
      name: 'umnaapp/search',
      url: SEARCH_SIMPLE_URL,
      params: { q, limit },
      validateStatus: (s) => s === 200 || s === 404,
      retries: SEARCH_SIMPLE_RETRIES,
    },
  ]

  if (USE_UMNAAPP_NOMINATIM) {
    providers.push({
      name: 'umnaapp/nominatim',
      url: UMNAAPP_NOMINATIM_SEARCH,
      params: { q, format: 'json', limit, addressdetails: 1 },
      validateStatus: (s) => s === 200,
      retries: 0,
    })
  }

  if (USE_OSM_NOMINATIM && OSM_NOMINATIM_URL) {
    const osmParams = { q, format: 'jsonv2', limit, addressdetails: 1 }
    if (hasOrigin && radiusKm != null) {
      const delta = Math.max(radiusKm / 111, 0.005)
      osmParams.viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`
      osmParams.bounded = 1
    }
    providers.push({
      name: 'openstreetmap',
      url: `${OSM_NOMINATIM_URL}/search`,
      params: osmParams,
      headers: { 'User-Agent': OSM_USER_AGENT, 'Accept-Language': 'en' },
      validateStatus: (s) => s === 200,
      retries: 1,
    })
  }

  const selfHosted = NOMINATIM_URL
  if (selfHosted) {
    const nominatimParams = { q, format: 'json', limit, addressdetails: 1 }
    if (hasOrigin && radiusKm != null) {
      const delta = Math.max(radiusKm / 111, 0.005)
      const minLng = lng - delta
      const maxLng = lng + delta
      const minLat = lat - delta
      const maxLat = lat + delta
      nominatimParams.viewbox = `${minLng},${maxLat},${maxLng},${minLat}`
      nominatimParams.bounded = 1
    }
    providers.push({
      name: 'nominatim-self',
      url: `${selfHosted}/search`,
      params: nominatimParams,
      validateStatus: (s) => s === 200,
      retries: 2,
    })
  }

  console.log(
    `[search] q="${q}" → querying ${providers.length} self-hosted provider(s):`,
    providers.map((p) => `${p.name} (${p.url})`)
  )

  const settled = await Promise.allSettled(
    providers.map((p) =>
      axiosWithRetry(
        () =>
          axios.get(p.url, {
            params: p.params,
            headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0', ...(p.headers || {}) },
            timeout: SEARCH_SIMPLE_TIMEOUT,
            validateStatus: p.validateStatus,
          }),
        { maxRetries: p.retries || 2 }
      ).then((res) => ({ provider: p.name, data: res.data }))
    )
  )

  const merged = []
  const providersUsed = []
  const errors = []
  const seen = new Set()

  const EARTH_R = 6378137
  const MAX_MERCATOR = Math.PI * EARTH_R

  const isValidWgs84 = (lat, lng) =>
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180

  const isWebMercator = (lat, lng) =>
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (Math.abs(lat) > 90 || Math.abs(lng) > 180) &&
    Math.abs(lat) <= MAX_MERCATOR &&
    Math.abs(lng) <= MAX_MERCATOR

  const mercatorToWgs84 = (y, x) => ({
    lat: ((Math.atan(Math.exp(y / EARTH_R)) * 2 - Math.PI / 2) * 180) / Math.PI,
    lng: (x / EARTH_R) * (180 / Math.PI),
  })

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i]
    const pName = providers[i].name
    if (outcome.status === 'fulfilled') {
      const raw = outcome.value.data
      const rows = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : []
      if (rows.length === 0) {
        errors.push({ provider: pName, reason: 'empty' })
        console.log(`[search] ✓ ${pName}: 200 OK but 0 results`)
        continue
      }
      let added = 0
      for (const r of rows) {
        let lat = parseFloat(r.lat)
        let lng = parseFloat(r.lon ?? r.lng)
        if (isWebMercator(lat, lng)) {
          const wgs = mercatorToWgs84(lat, lng)
          lat = wgs.lat
          lng = wgs.lng
        }
        if (!isValidWgs84(lat, lng)) continue
        const key = `${lat.toFixed(5)}-${lng.toFixed(5)}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(
          normalizeSearchRowAddress({ ...r, lat, lon: lng, _provider: pName })
        )
        added += 1
      }
      if (added > 0) {
        providersUsed.push(pName)
        console.log(`[search] ✓ ${pName}: ${rows.length} raw → ${added} added (after dedupe/validation)`)
      } else {
        errors.push({ provider: pName, reason: 'no valid coords' })
        console.log(`[search] ✓ ${pName}: ${rows.length} raw but 0 usable (no valid coords / duplicates)`)
      }
    } else {
      const err = outcome.reason
      const status = err?.response?.status
      const reason = status ? `upstream ${status}` : err?.message || 'unknown'
      errors.push({ provider: pName, reason })
      console.warn(`[search] ✗ ${pName} failed:`, reason)
    }
  }

  if (merged.length > 0) {
    console.log(
      `[search] RESULT for q="${q}": ${merged.length} place(s), used provider(s): ${providersUsed.join(' + ')}`
    )
    return { provider: providersUsed.join('+'), providers: providersUsed, rows: merged }
  }

  console.warn(`[search] RESULT for q="${q}": 0 places — all providers empty/failed`, errors)
  return {
    provider: null,
    providers: [],
    rows: [],
    error: errors[errors.length - 1] || null,
  }
}
