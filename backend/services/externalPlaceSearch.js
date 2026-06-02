import axios from 'axios'

const SEARCH_SIMPLE_URL = (process.env.SEARCH_SIMPLE_URL || 'https://umnaapp.in/search').trim().replace(/\/+$/, '')
const NOMINATIM_URL = (process.env.NOMINATIM_URL || '').trim().replace(/\/+$/, '')
const UMNAAPP_NOMINATIM_SEARCH = 'https://umnaapp.in/map/nominatim/search'
const NOMINATIM_PUBLIC_SEARCH = 'https://nominatim.openstreetmap.org/search'
const SEARCH_SIMPLE_TIMEOUT = parseInt(process.env.SEARCH_SIMPLE_TIMEOUT, 10) || 20000

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
 * Query configured geocoders in parallel and merge results (Nominatim / umnaapp shape).
 */
export async function searchExternalProviders(q, { limit = 10 } = {}) {
  const providers = [
    {
      name: 'umnaapp/search',
      url: SEARCH_SIMPLE_URL,
      params: { q },
      validateStatus: (s) => s === 200 || s === 404,
      retries: 1,
    },
    {
      name: 'umnaapp/nominatim',
      url: UMNAAPP_NOMINATIM_SEARCH,
      params: { q, format: 'json', limit, addressdetails: 1 },
      validateStatus: (s) => s === 200,
      retries: 2,
    },
  ]

  const selfHosted = NOMINATIM_URL
  if (selfHosted) {
    providers.push({
      name: 'nominatim-self',
      url: `${selfHosted}/search`,
      params: { q, format: 'json', limit, addressdetails: 1 },
      validateStatus: (s) => s === 200,
      retries: 2,
    })
  }

  providers.push({
    name: 'nominatim-public',
    url: NOMINATIM_PUBLIC_SEARCH,
    params: { q, format: 'json', limit, addressdetails: 1 },
    validateStatus: (s) => s === 200,
    headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
    retries: 3,
  })

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
        merged.push({ ...r, lat, lon: lng, _provider: pName })
        added += 1
      }
      if (added > 0) providersUsed.push(pName)
      else errors.push({ provider: pName, reason: 'no valid coords' })
    } else {
      const err = outcome.reason
      const status = err?.response?.status
      const reason = status ? `upstream ${status}` : err?.message || 'unknown'
      errors.push({ provider: pName, reason })
      console.warn(`Search provider ${pName} failed:`, reason)
    }
  }

  if (merged.length > 0) {
    return { provider: providersUsed.join('+'), providers: providersUsed, rows: merged }
  }

  try {
    const fallback = await axiosWithRetry(
      () =>
        axios.get(NOMINATIM_PUBLIC_SEARCH, {
          params: { q, format: 'json', limit, addressdetails: 1 },
          headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
          timeout: SEARCH_SIMPLE_TIMEOUT,
          validateStatus: (s) => s === 200,
        }),
      { maxRetries: 2 }
    )
    const rows = Array.isArray(fallback.data) ? fallback.data : []
    for (const r of rows) {
      const lat = parseFloat(r.lat)
      const lng = parseFloat(r.lon ?? r.lng)
      if (!isValidWgs84(lat, lng)) continue
      const key = `${lat.toFixed(5)}-${lng.toFixed(5)}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ ...r, _provider: 'nominatim-fallback' })
    }
    if (merged.length > 0) {
      return { provider: 'nominatim-fallback', providers: ['nominatim-fallback'], rows: merged }
    }
  } catch (fallbackErr) {
    console.warn('Nominatim fallback also failed:', fallbackErr.message)
  }

  return {
    provider: null,
    providers: [],
    rows: [],
    error: errors[errors.length - 1] || null,
  }
}
