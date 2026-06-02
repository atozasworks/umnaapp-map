import axios from 'axios'
import prisma from '../config/database.js'
import { placePublicVisibilityOr, enrichPlaceApprovalMeta } from './placeApproval.js'
import { haversineMeters, radiusKmToDelta } from '../utils/geo.js'
import { PLACE_CATEGORIES, CATEGORY_ALIASES } from './askMapsConstants.js'
import { searchExternalProviders } from './externalPlaceSearch.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You parse natural-language map search queries for an Indian places app.
Return ONLY valid JSON with this exact shape (no markdown):
{
  "category": string|null,
  "locationType": "near_me"|"named"|"map_center"|null,
  "locationName": string|null,
  "radiusKm": number|null,
  "filters": {
    "nearby": boolean,
    "bestRated": boolean,
    "openNow": boolean
  },
  "sortBy": "distance"|"rating"|"relevance",
  "limit": number,
  "summary": string
}
Rules:
- category must be one of: ${PLACE_CATEGORIES.join(', ')} or null
- "near me", "nearby", "around me" → locationType "near_me", filters.nearby true
- "in Kadaba", "at Bangalore" → locationType "named", locationName the place name
- "within 2 km", "2km" → radiusKm number
- "best", "top rated" → filters.bestRated true, sortBy "rating"
- "open now" → filters.openNow true
- Default radiusKm: 5 for near_me, null for named area (search whole area text)
- limit: 25 default, max 50
- summary: one short sentence describing what the user wants`

const PLACE_SELECT = {
  id: true,
  name: true,
  placeNameEn: true,
  placeNameLocal: true,
  category: true,
  latitude: true,
  longitude: true,
  zoomLevel: true,
  rating: true,
  reviewCount: true,
  openingHours: true,
  businessStatus: true,
  fullAddress: true,
  village: true,
  taluk: true,
  district: true,
  state: true,
  vicinity: true,
  phone: true,
  approvalStatus: true,
  approvedAt: true,
  autoApproveAt: true,
}

function normalizeCategory(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  const exact = PLACE_CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase())
  if (exact) return exact
  const alias = CATEGORY_ALIASES[s.toLowerCase()]
  if (alias) return alias
  for (const [key, val] of Object.entries(CATEGORY_ALIASES)) {
    if (s.toLowerCase().includes(key)) return val
  }
  return null
}

function parseIntentFallback(query) {
  const q = String(query || '').trim().toLowerCase()
  let category = null
  for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
    if (q.includes(alias)) {
      category = cat
      break
    }
  }
  if (!category) {
    for (const cat of PLACE_CATEGORIES) {
      if (q.includes(cat.toLowerCase())) {
        category = cat
        break
      }
    }
  }

  const nearMe = /\b(near me|nearby|around me|close to me)\b/.test(q)
  const bestRated = /\b(best|top rated|highest rated)\b/.test(q)
  const openNow = /\bopen now\b/.test(q)
  const radiusMatch = q.match(/(?:within\s+)?(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometre)s?\b/)
  const radiusKm = radiusMatch ? parseFloat(radiusMatch[1]) : nearMe ? 5 : null

  let locationType = null
  let locationName = null
  const inMatch = q.match(/\b(?:in|at|near)\s+([a-z][a-z0-9\s.-]{1,40})/i)
  if (inMatch && !nearMe) {
    locationType = 'named'
    locationName = inMatch[1].replace(/\s+(open|best|within).*$/i, '').trim()
  } else if (nearMe) {
    locationType = 'near_me'
  }

  return {
    category,
    locationType,
    locationName,
    radiusKm,
    filters: { nearby: nearMe, bestRated, openNow },
    sortBy: bestRated ? 'rating' : nearMe ? 'distance' : 'relevance',
    limit: 25,
    summary: `Search for ${category || 'places'}${locationName ? ` in ${locationName}` : nearMe ? ' near you' : ''}`,
  }
}

function sanitizeGroqIntent(raw) {
  const filters = raw?.filters || {}
  return {
    category: normalizeCategory(raw?.category),
    locationType: ['near_me', 'named', 'map_center'].includes(raw?.locationType)
      ? raw.locationType
      : null,
    locationName: raw?.locationName ? String(raw.locationName).trim().slice(0, 80) : null,
    radiusKm:
      raw?.radiusKm != null && Number.isFinite(Number(raw.radiusKm))
        ? Math.min(50, Math.max(0.5, Number(raw.radiusKm)))
        : null,
    filters: {
      nearby: Boolean(filters.nearby),
      bestRated: Boolean(filters.bestRated),
      openNow: Boolean(filters.openNow),
    },
    sortBy: ['distance', 'rating', 'relevance'].includes(raw?.sortBy) ? raw.sortBy : 'relevance',
    limit: Math.min(50, Math.max(1, parseInt(raw?.limit, 10) || 25)),
    summary: String(raw?.summary || '').trim().slice(0, 200) || 'Map search',
  }
}

export async function parseIntentWithGroq(query) {
  const key = (process.env.GROQ_API_KEY || '').trim()
  if (!key) return parseIntentFallback(query)

  try {
    const { data } = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        timeout: parseInt(process.env.GROQ_TIMEOUT_MS, 10) || 8000,
      }
    )
    const content = data?.choices?.[0]?.message?.content
    if (!content) return parseIntentFallback(query)
    const parsed = JSON.parse(content)
    const intent = sanitizeGroqIntent(parsed)
    if (!intent.category) intent.category = normalizeCategory(parsed.category) || parseIntentFallback(query).category
    return intent
  } catch (err) {
    console.warn('Groq Ask Maps parse failed, using fallback:', err.message)
    return parseIntentFallback(query)
  }
}

function isPlaceOpenNow(openingHours, businessStatus) {
  if (businessStatus && String(businessStatus).toUpperCase() !== 'OPERATIONAL') return false
  if (!openingHours || typeof openingHours !== 'object') return null
  if (typeof openingHours.open_now === 'boolean') return openingHours.open_now
  return null
}

async function geocodeLocationName(name) {
  if (!name) return null
  try {
    const { rows } = await searchExternalProviders(name, { limit: 5 })
    const first = rows.find((r) => Number.isFinite(parseFloat(r.lat)))
    if (!first) return null
    const lat = parseFloat(first.lat)
    const lng = parseFloat(first.lon ?? first.lng)
    return {
      lat,
      lng,
      name: first.display_name || first.displayName || first.name || name,
    }
  } catch {
    return null
  }
}

function buildExternalSearchQuery(intent, originalQuery) {
  const parts = []
  if (intent.category) parts.push(intent.category)
  if (intent.locationName) parts.push(intent.locationName)
  if (intent.filters?.nearby) parts.push('near me')
  const built = parts.join(' ').trim()
  return built.length >= 2 ? built : String(originalQuery || '').trim()
}

function mapExternalRowToAskPlace(row, intent, origin) {
  const lat = parseFloat(row.lat)
  const lng = parseFloat(row.lon ?? row.lng)
  const displayName = row.display_name ?? row.displayName ?? row.name ?? 'Place'
  const distanceMeters =
    origin != null ? haversineMeters(origin.lat, origin.lng, lat, lng) : null
  const addr = row.address || {}
  return {
    id: String(row.place_id ?? row.osm_id ?? `ext-${lat.toFixed(5)}-${lng.toFixed(5)}`),
    name: displayName,
    place_name_en: displayName,
    place_name_local: null,
    category: intent.category || 'Other',
    latitude: lat,
    longitude: lng,
    rating: null,
    reviewCount: null,
    distanceMeters: distanceMeters != null ? Math.round(distanceMeters) : null,
    village: addr.village || addr.suburb || addr.town || null,
    district: addr.state_district || addr.county || addr.city || null,
    state: addr.state || null,
    source: 'external',
  }
}

function coordKey(lat, lng) {
  return `${Number(lat).toFixed(5)}-${Number(lng).toFixed(5)}`
}

async function supplementWithExternalPlaces(limited, { intent, query, origin, radiusKm }) {
  const minWanted = Math.min(5, intent.limit)
  if (limited.length >= minWanted) {
    return { places: limited, externalCount: 0 }
  }

  const searchQ = buildExternalSearchQuery(intent, query)
  if (searchQ.length < 2) return { places: limited, externalCount: 0 }

  const { rows } = await searchExternalProviders(searchQ, { limit: intent.limit })
  if (!rows.length) return { places: limited, externalCount: 0 }

  const seen = new Set(limited.map((p) => coordKey(p.latitude, p.longitude)))
  const extras = []

  for (const row of rows) {
    const mapped = mapExternalRowToAskPlace(row, intent, origin)
    const key = coordKey(mapped.latitude, mapped.longitude)
    if (seen.has(key)) continue
    seen.add(key)

    if (origin && radiusKm != null) {
      const maxM = radiusKm * 1000
      if (mapped.distanceMeters != null && mapped.distanceMeters > maxM) continue
    }

    if (intent.category && (intent.locationType === 'near_me' || intent.filters?.nearby)) {
      const cat = intent.category.toLowerCase()
      const hay = `${mapped.name} ${mapped.category}`.toLowerCase()
      const aliasHit = Object.entries(CATEGORY_ALIASES).some(
        ([alias, canon]) => canon === intent.category && hay.includes(alias)
      )
      if (!hay.includes(cat) && !aliasHit) continue
    }

    extras.push(mapped)
    if (limited.length + extras.length >= intent.limit) break
  }

  const merged = [...limited, ...extras].slice(0, intent.limit)
  return { places: merged, externalCount: extras.length }
}

function buildLocationTextFilter(locationName) {
  const term = String(locationName || '').trim()
  if (!term) return null
  return {
    OR: [
      { village: { contains: term, mode: 'insensitive' } },
      { taluk: { contains: term, mode: 'insensitive' } },
      { district: { contains: term, mode: 'insensitive' } },
      { state: { contains: term, mode: 'insensitive' } },
      { fullAddress: { contains: term, mode: 'insensitive' } },
      { vicinity: { contains: term, mode: 'insensitive' } },
      { name: { contains: term, mode: 'insensitive' } },
      { placeNameEn: { contains: term, mode: 'insensitive' } },
    ],
  }
}

function serializeAskPlace(p, extra = {}) {
  const base = enrichPlaceApprovalMeta({
    ...p,
    name: p.placeNameEn ?? p.name,
    place_name_en: p.placeNameEn ?? p.name,
    place_name_local: p.placeNameLocal,
  })
  return { ...base, ...extra }
}

/**
 * Run Ask Maps: parse query, fetch DB places, return ranked results.
 */
export async function runAskMapsQuery({ query, userLat, userLng, viewerId }) {
  const intent = await parseIntentWithGroq(query)

  let origin = null
  let center = null

  if (intent.locationType === 'near_me' || intent.filters.nearby) {
    if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
      origin = { lat: userLat, lng: userLng }
      center = { lat: userLat, lng: userLng, name: 'Your location' }
    }
  } else if (intent.locationType === 'map_center') {
    if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
      origin = { lat: userLat, lng: userLng }
      center = { lat: userLat, lng: userLng, name: 'Map center' }
    }
  } else if (intent.locationType === 'named' && intent.locationName) {
    const geo = await geocodeLocationName(intent.locationName)
    if (geo) {
      origin = { lat: geo.lat, lng: geo.lng }
      center = { lat: geo.lat, lng: geo.lng, name: geo.name }
    }
  } else if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    origin = { lat: userLat, lng: userLng }
  }

  const radiusKm =
    intent.radiusKm ??
    (intent.locationType === 'near_me' || intent.filters.nearby ? 5 : null)

  const whereParts = [placePublicVisibilityOr(viewerId)]

  if (intent.category) {
    whereParts.push({ category: { equals: intent.category, mode: 'insensitive' } })
  }

  if (intent.locationType === 'named' && intent.locationName) {
    const locFilter = buildLocationTextFilter(intent.locationName)
    if (locFilter) whereParts.push(locFilter)
  }

  if (origin && radiusKm != null) {
    const delta = radiusKmToDelta(radiusKm)
    whereParts.push({
      latitude: { gte: origin.lat - delta, lte: origin.lat + delta },
      longitude: { gte: origin.lng - delta, lte: origin.lng + delta },
    })
  }

  if (!prisma.place) {
    return {
      interpretation: intent.summary,
      intent,
      places: [],
      center,
      count: 0,
      error: 'Place model not available',
    }
  }

  let rows = await prisma.place.findMany({
    where: { AND: whereParts },
    take: 500,
    select: PLACE_SELECT,
  })

  // Named area + category often over-filters (0 rows); retry location-only in DB
  if (rows.length === 0 && intent.category && intent.locationType === 'named' && intent.locationName) {
    const relaxedParts = [placePublicVisibilityOr(viewerId)]
    const locFilter = buildLocationTextFilter(intent.locationName)
    if (locFilter) relaxedParts.push(locFilter)
    if (origin && radiusKm != null) {
      const delta = radiusKmToDelta(radiusKm)
      relaxedParts.push({
        latitude: { gte: origin.lat - delta, lte: origin.lat + delta },
        longitude: { gte: origin.lng - delta, lte: origin.lng + delta },
      })
    }
    rows = await prisma.place.findMany({
      where: { AND: relaxedParts },
      take: 500,
      select: PLACE_SELECT,
    })
  }

  // Last DB fallback: match words from the user's question
  if (rows.length === 0 && String(query || '').trim().length >= 2) {
    const q = String(query).trim().slice(0, 120)
    rows = await prisma.place.findMany({
      where: {
        AND: [
          placePublicVisibilityOr(viewerId),
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { placeNameEn: { contains: q, mode: 'insensitive' } },
              { placeNameLocal: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
              { village: { contains: q, mode: 'insensitive' } },
              { district: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 100,
      select: PLACE_SELECT,
    })
  }

  let places = rows.map((p) => {
    const distanceMeters =
      origin != null
        ? haversineMeters(origin.lat, origin.lng, p.latitude, p.longitude)
        : null
    return { row: p, distanceMeters }
  })

  if (origin && radiusKm != null) {
    const maxM = radiusKm * 1000
    places = places.filter((x) => x.distanceMeters == null || x.distanceMeters <= maxM)
  }

  if (intent.filters.openNow) {
    places = places.filter(({ row }) => {
      const open = isPlaceOpenNow(row.openingHours, row.businessStatus)
      return open === true
    })
  }

  if (intent.filters.bestRated) {
    places = places.filter(({ row }) => row.rating != null && row.rating >= 3.5)
  }

  if (intent.sortBy === 'rating') {
    places.sort((a, b) => (b.row.rating ?? 0) - (a.row.rating ?? 0))
  } else if (intent.sortBy === 'distance' && origin) {
    places.sort((a, b) => (a.distanceMeters ?? 1e12) - (b.distanceMeters ?? 1e12))
  } else if (origin) {
    places.sort((a, b) => (a.distanceMeters ?? 1e12) - (b.distanceMeters ?? 1e12))
  }

  let limited = places.slice(0, intent.limit).map(({ row, distanceMeters }) =>
    serializeAskPlace(row, {
      distanceMeters: distanceMeters != null ? Math.round(distanceMeters) : null,
    })
  )

  let externalCount = 0
  try {
    const supplemented = await supplementWithExternalPlaces(limited, {
      intent,
      query,
      origin,
      radiusKm,
    })
    limited = supplemented.places
    externalCount = supplemented.externalCount
  } catch (extErr) {
    console.warn('Ask Maps external supplement failed:', extErr.message)
  }

  let interpretation = intent.summary
  if (externalCount > 0 && limited.length > 0) {
    interpretation = `${intent.summary} (includes ${externalCount} web result${externalCount === 1 ? '' : 's'})`
  }

  return {
    interpretation,
    intent: {
      category: intent.category,
      locationType: intent.locationType,
      locationName: intent.locationName,
      radiusKm,
      filters: intent.filters,
      sortBy: intent.sortBy,
    },
    places: limited,
    center,
    count: limited.length,
    externalCount,
    aiEnabled: Boolean((process.env.GROQ_API_KEY || '').trim()),
  }
}
