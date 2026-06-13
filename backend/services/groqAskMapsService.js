import axios from 'axios'
import prisma from '../config/database.js'
import { placePublicVisibilityOr, enrichPlaceApprovalMeta } from './placeApproval.js'
import { haversineMeters, radiusKmToDelta } from '../utils/geo.js'
import {
  PLACE_CATEGORIES,
  CATEGORY_ALIASES,
  CATEGORY_NAME_KEYWORDS,
} from './askMapsConstants.js'
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
- "within 2 km", "2km", "2km olagiruva" → radiusKm number
- "ATM or hotels" → pick the best single category or prefer ATM/Hotel when both appear
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
  website: true,
  description: true,
  googlePhotos: true,
  googleType: true,
  googleTypes: true,
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

/** Parse "2 km", "2km", "within 2km olagiruva", etc. from the raw query. */
function extractRadiusKm(query) {
  const q = String(query || '').toLowerCase()
  const patterns = [
    /(?:within|inside|under|olagiruva|olage|olaga|hattira|hatra|rad)\s+(\d+(?:\.\d+)?)\s*(?:km|kms|kilometer|kilometre|kilometers|kilometres)\b/i,
    /\b(\d+(?:\.\d+)?)\s*(?:km|kms|kilometer|kilometre|kilometers|kilometres)\b/i,
  ]
  for (const re of patterns) {
    const m = q.match(re)
    if (m) return Math.min(50, Math.max(0.5, parseFloat(m[1])))
  }
  return null
}

/** Detect proximity intent (English + common Kannada romanized terms). */
function detectNearMe(query) {
  const q = String(query || '').toLowerCase()
  if (
    /\b(near me|nearby|around me|close to me|near here|hattira|hatra|hapattige|samipa|samip|nannadu|nanna hatra|current location|iddaru)\b/.test(
      q
    )
  ) {
    return true
  }
  if (/\b(?:within|inside|under|olagiruva|olage|olaga|olge|hattira)\b/.test(q) && extractRadiusKm(query) != null) {
    return true
  }
  if (/\b\d+(?:\.\d+)?\s*km\s+(?:olage|olagiruva|olaga|olge|radius|rad)\b/.test(q)) {
    return true
  }
  return extractRadiusKm(query) != null
}

/** Match one or more categories, e.g. "ATM or hotels". */
function extractCategories(query) {
  const q = String(query || '').toLowerCase()
  const segments = q.split(/\s+(?:or|and|\/|,|athava|mathu)\s+/i)
  const parts = segments.length > 1 ? segments : [q]
  const cats = new Set()
  for (const seg of parts) {
    for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
      if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(seg)) {
        cats.add(cat)
      }
    }
    for (const cat of PLACE_CATEGORIES) {
      if (new RegExp(`\\b${cat.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(seg)) {
        cats.add(cat)
      }
    }
  }
  return [...cats]
}

function categoryKeywordsFor(wanted) {
  const set = new Set([String(wanted).toLowerCase()])
  for (const [alias, canon] of Object.entries(CATEGORY_ALIASES)) {
    if (canon === wanted) set.add(alias)
  }
  for (const kw of CATEGORY_NAME_KEYWORDS[wanted] || []) {
    set.add(kw.toLowerCase())
  }
  return [...set]
}

/**
 * Whole-word match so short keywords don't match inside unrelated words.
 * Without this, "inn" matches "dinner", "atm" matches "atmosphere", "mart"
 * matches "smart" — which leaks restaurants/shops into a "hotels" search.
 */
function wordBoundaryIncludes(hay, term) {
  const t = String(term || '').toLowerCase().trim()
  if (!t) return false
  const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return re.test(hay)
}

/** Does the haystack text match any of the wanted categories (whole-word)? */
function hayMatchesCategories(hay, cats) {
  if (!cats.length) return true
  return cats.some((wanted) => {
    if (wordBoundaryIncludes(hay, wanted)) return true
    return categoryKeywordsFor(wanted).some((kw) => wordBoundaryIncludes(hay, kw))
  })
}

function buildCategoryFilter(category, categories, { relaxed = false } = {}) {
  const cats =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : category
        ? [category]
        : []
  if (!cats.length) return null

  if (!relaxed) {
    return {
      OR: cats.map((c) => ({ category: { equals: c, mode: 'insensitive' } })),
    }
  }

  const orParts = []
  for (const cat of cats) {
    orParts.push({ category: { equals: cat, mode: 'insensitive' } })
    for (const kw of categoryKeywordsFor(cat)) {
      // Skip very short keywords (inn, atm, gas, bus, gym…) in the SQL prefetch:
      // `contains` is a substring match, so they would pull in huge amounts of
      // unrelated rows (dinner, atmosphere…) and crowd out real matches under
      // the row cap. The whole-word post-filter still catches genuine name hits.
      if (kw.length < 4) continue
      orParts.push({ name: { contains: kw, mode: 'insensitive' } })
      orParts.push({ placeNameEn: { contains: kw, mode: 'insensitive' } })
      orParts.push({ placeNameLocal: { contains: kw, mode: 'insensitive' } })
      orParts.push({ vicinity: { contains: kw, mode: 'insensitive' } })
    }
  }
  return { OR: orParts }
}

function wantedCategories(intent) {
  if (Array.isArray(intent.categories) && intent.categories.length > 0) return intent.categories
  if (intent.category) return [intent.category]
  return []
}

function placeMatchesCategoryIntent(row, intent) {
  const cats = wantedCategories(intent)
  if (!cats.length) return true
  // The stored category is the authoritative signal; an exact match always wins.
  const rowCat = String(row.category || '').toLowerCase()
  if (cats.some((c) => c.toLowerCase() === rowCat)) return true
  const hay = [
    row.category,
    row.name,
    row.placeNameEn,
    row.placeNameLocal,
    row.vicinity,
    row.googleType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hayMatchesCategories(hay, cats)
}

const NEAR_ME_LOCATION_NAMES = /^(me|here|my location|current location|nearby|near me|around me)$/i

function enrichIntentFromQuery(intent, query) {
  const qRadius = extractRadiusKm(query)
  if (qRadius != null) intent.radiusKm = qRadius

  const cats = extractCategories(query)
  if (cats.length > 1) {
    // Multiple categories explicitly named (e.g. "ATM or hotels").
    intent.categories = cats
    intent.category = null
  } else if (cats.length === 1) {
    // A single category literally present in the query is authoritative — trust
    // it over a mismatched LLM guess (e.g. query says "hotels" but Groq returned
    // "Restaurant"). Only keep the LLM category when the query names no category.
    if (!intent.category || !cats.includes(intent.category)) {
      intent.category = cats[0]
    }
    intent.categories = undefined
  }

  const near = detectNearMe(query)
  // Groq sometimes turns "near me" into a named location ("me"/"here"); treat
  // that as proximity intent so we search around the user, not a phantom place.
  if (near && (!intent.locationName || NEAR_ME_LOCATION_NAMES.test(intent.locationName.trim()))) {
    intent.locationName = null
    if (!intent.locationType || intent.locationType === 'map_center' || intent.locationType === 'named') {
      intent.locationType = 'near_me'
    }
    intent.filters.nearby = true
  }

  if (intent.radiusKm != null && !intent.locationName && !intent.locationType) {
    intent.locationType = 'near_me'
    intent.filters.nearby = true
  }

  return intent
}

function parseIntentFallback(query) {
  const q = String(query || '').trim().toLowerCase()
  const categories = extractCategories(query)
  const category = categories.length === 1 ? categories[0] : null

  const nearMe = detectNearMe(query)
  const bestRated = /\b(best|top rated|highest rated)\b/.test(q)
  const openNow = /\bopen now\b/.test(q)
  const radiusKm = extractRadiusKm(query) ?? (nearMe ? 5 : null)

  let locationType = null
  let locationName = null
  const inMatch = q.match(/\b(?:in|at|near)\s+([a-z][a-z0-9\s.-]{1,40})/i)
  if (inMatch && !nearMe) {
    locationType = 'named'
    locationName = inMatch[1].replace(/\s+(open|best|within|olagiruva|olage).*$/i, '').trim()
  } else if (nearMe) {
    locationType = 'near_me'
  }

  const catLabel =
    categories.length > 1 ? categories.join(' or ') : category || 'places'

  return {
    category,
    categories: categories.length > 1 ? categories : undefined,
    locationType,
    locationName,
    radiusKm,
    filters: { nearby: nearMe, bestRated, openNow },
    sortBy: bestRated ? 'rating' : nearMe || radiusKm != null ? 'distance' : 'relevance',
    limit: 25,
    summary: `Search for ${catLabel}${locationName ? ` in ${locationName}` : nearMe || radiusKm != null ? ' near you' : ''}${radiusKm != null ? ` within ${radiusKm} km` : ''}`,
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
    console.warn('PlaceFinder parse failed, using fallback:', err.message)
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
    const { rows } = await searchExternalProviders(name, { limit: 20 })
    const pts = rows
      .map((r) => ({
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon ?? r.lng),
        name: r.display_name || r.displayName || r.name || name,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    if (!pts.length) return null

    // Multiple places can share a name (e.g. "Mangaluru" exists in Koppal,
    // Shimoga AND the coastal city). Prefer exact-name matches, then pick the
    // candidate with the most siblings clustered nearby — that is almost always
    // the prominent town/city the user means.
    const term = String(name).trim().toLowerCase()
    const exact = pts.filter((p) => String(p.name).trim().toLowerCase() === term)
    const candidates = exact.length ? exact : pts

    let best = candidates[0]
    let bestScore = -1
    for (const c of candidates) {
      let score = 0
      for (const p of pts) {
        if (haversineMeters(c.lat, c.lng, p.lat, p.lng) <= 25000) score += 1
      }
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    return { lat: best.lat, lng: best.lng, name: best.name }
  } catch {
    return null
  }
}

function buildExternalSearchQuery(intent, originalQuery, origin) {
  const cats = wantedCategories(intent)
  const label = cats.length === 1 ? cats[0] : cats.length > 1 ? cats.join(' ') : null
  if (origin && label) {
    return `${label} ${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`
  }
  const parts = []
  if (label) parts.push(label)
  if (intent.locationName) parts.push(intent.locationName)
  if (intent.filters?.nearby && !origin) parts.push('near me')
  const built = parts.join(' ').trim()
  return built.length >= 2 ? built : String(originalQuery || '').trim()
}

function externalSearchQueries(intent, query, origin) {
  const cats = wantedCategories(intent)
  const labels = cats.length ? cats : ['places']
  const loc = intent.locationName ? String(intent.locationName).trim() : null
  const queries = new Set()

  // The external provider (umnaapp.in/search) matches by place NAME only and
  // ignores lat/lon. So build queries that actually return rows:
  //   - bare category keywords ("hospital", "clinic", "nursing home") → broad,
  //     filtered later by distance / location token
  //   - "<location> <category>" and "<category> <location>" combos
  //   - the location name itself ("mangalore") → area places, filtered by category
  for (const label of labels) {
    queries.add(label)
    for (const kw of categoryKeywordsFor(label).slice(0, 4)) queries.add(kw)
    if (loc) {
      queries.add(`${loc} ${label}`)
      queries.add(`${label} ${loc}`)
    }
  }
  if (loc) queries.add(loc)

  queries.add(buildExternalSearchQuery(intent, query, origin))
  const stripped = String(query || '')
    .replace(/\b\d+(?:\.\d+)?\s*km\b/gi, '')
    .replace(/\b(?:olage|olagiruva|olaga|iddaru|near me|nearby)\b/gi, '')
    .trim()
  if (stripped.length >= 2) queries.add(stripped)
  return [...queries].filter((q) => q.length >= 2)
}

/** Does an external row belong to the named location (e.g. "mangalore")? */
function externalRowMatchesLocation(row, locationName) {
  const term = String(locationName || '').trim().toLowerCase()
  if (!term) return true
  const addr = row.address || {}
  const hay = [
    row.display_name,
    row.displayName,
    row.name,
    row.taluk,
    row.district,
    row.state,
    addr.village,
    addr.town,
    addr.suburb,
    addr.county,
    addr.state_district,
    addr.city,
    addr.municipality,
    addr.state,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (hay.includes(term)) return true
  // "mangalore" vs "Mangaluru taluk" — match on a 5+ char prefix.
  const prefix = term.slice(0, 6)
  return prefix.length >= 5 && hay.includes(prefix)
}

function externalRowMatchesCategory(row, intent) {
  const cats = wantedCategories(intent)
  if (!cats.length) return true
  const hay = [
    row.display_name,
    row.displayName,
    row.name,
    row.type,
    row.category,
    row.class,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hayMatchesCategories(hay, cats)
}

function inferCategoryFromExternalRow(row, fallback = 'Other') {
  const hay = [
    row.display_name,
    row.displayName,
    row.name,
    row.type,
    row.category,
    row.class,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (/\bhotel|lodge|resort|inn\b/.test(hay)) return 'Hotel'
  if (/\batm\b/.test(hay)) return 'ATM'
  if (/\brestaurant|cafe|food\b/.test(hay)) return 'Restaurant'
  if (/\bhospital|clinic\b/.test(hay)) return 'Hospital'
  if (/\bpharmacy|chemist\b/.test(hay)) return 'Pharmacy'
  if (/\btemple|masjid|mosque|church\b/.test(hay)) return 'Temple'
  return fallback
}

function mapExternalRowToAskPlace(row, intent, origin) {
  const lat = parseFloat(row.lat)
  const lng = parseFloat(row.lon ?? row.lng)
  const displayName = row.display_name ?? row.displayName ?? row.name ?? 'Place'
  const distanceMeters =
    origin != null ? haversineMeters(origin.lat, origin.lng, lat, lng) : null
  const addr = row.address || {}
  const category =
    intent.category ||
    (Array.isArray(intent.categories) && intent.categories.length === 1
      ? intent.categories[0]
      : inferCategoryFromExternalRow(row, 'Other'))
  return {
    id: String(row.place_id ?? row.osm_id ?? `ext-${lat.toFixed(5)}-${lng.toFixed(5)}`),
    name: displayName,
    place_name_en: displayName,
    place_name_local: null,
    category,
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

function sortAskPlaces(list, { intent, origin }) {
  const sorted = [...list]
  if (intent.sortBy === 'rating') {
    sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  } else if (origin) {
    sorted.sort((a, b) => (a.distanceMeters ?? 1e12) - (b.distanceMeters ?? 1e12))
  }
  return sorted
}

/**
 * Always query the external (OpenStreetMap / umnaapp.in) geocoders and merge
 * their results with the DB (umnaapp) places, so PlaceFinder returns combined
 * results from both sources — not only when the DB list is short.
 */
async function mergeWithExternalPlaces(dbPlaces, { intent, query, origin, radiusKm }) {
  const queries = externalSearchQueries(intent, query, origin)
  if (!queries.length) {
    return {
      places: sortAskPlaces(dbPlaces, { intent, origin }).slice(0, intent.limit),
      externalCount: 0,
    }
  }

  const seen = new Set(dbPlaces.map((p) => coordKey(p.latitude, p.longitude)))
  const extras = []
  const locationName = intent.locationName ? String(intent.locationName).trim() : null
  // Distance bound: explicit radius, else a generous default around a named
  // area so far-away same-name matches (e.g. "Hospital" in another state)
  // are excluded once we have coordinates to compare against.
  const effectiveRadiusKm = radiusKm ?? (locationName && origin ? 35 : null)
  const maxM = origin && effectiveRadiusKm != null ? effectiveRadiusKm * 1000 : null
  // Fetch enough external rows to be meaningful even when the DB already has
  // many places; the final slice still respects intent.limit.
  const fetchLimit = Math.max(intent.limit, 20)

  for (const searchQ of queries) {
    if (extras.length >= fetchLimit) break
    const { rows } = await searchExternalProviders(searchQ, {
      limit: fetchLimit,
      lat: origin?.lat,
      lng: origin?.lng,
      radiusKm: effectiveRadiusKm,
    })
    for (const row of rows) {
      if (!externalRowMatchesCategory(row, intent)) continue

      const mapped = mapExternalRowToAskPlace(row, intent, origin)
      const key = coordKey(mapped.latitude, mapped.longitude)
      if (seen.has(key)) continue

      // Named-location query: keep rows that match the place by name/address
      // token OR fall within the distance bound. (The provider's geocode is
      // imprecise, so the location token is the primary signal.)
      if (locationName) {
        const tokenOk = externalRowMatchesLocation(row, locationName)
        const distOk =
          maxM != null && mapped.distanceMeters != null && mapped.distanceMeters <= maxM
        if (!tokenOk && !distOk) continue
      } else if (maxM != null) {
        if (mapped.distanceMeters == null || mapped.distanceMeters > maxM) continue
      }

      seen.add(key)
      extras.push(mapped)
      if (extras.length >= fetchLimit) break
    }
  }

  const merged = sortAskPlaces([...dbPlaces, ...extras], { intent, origin }).slice(0, intent.limit)
  return { places: merged, externalCount: extras.length }
}

function buildLocationTextFilter(locationName) {
  const term = String(locationName || '').trim()
  if (!term) return null
  // Match common spelling variants (e.g. "Mangalore" ↔ "Mangaluru") via a
  // shared prefix so DB rows stored under either form are found.
  const terms = new Set([term])
  if (term.length >= 6) terms.add(term.slice(0, 6))
  const fields = [
    'village',
    'taluk',
    'district',
    'state',
    'fullAddress',
    'vicinity',
    'name',
    'placeNameEn',
  ]
  const or = []
  for (const t of terms) {
    for (const field of fields) {
      or.push({ [field]: { contains: t, mode: 'insensitive' } })
    }
  }
  return { OR: or }
}

function firstPhotoUrl(googlePhotos) {
  if (!Array.isArray(googlePhotos) || !googlePhotos.length) return null
  const first = googlePhotos[0]
  if (typeof first === 'string') return first
  return first?.url ?? null
}

function serializeAskPlace(p, extra = {}) {
  const thumb = firstPhotoUrl(p.googlePhotos)
  const base = enrichPlaceApprovalMeta({
    ...p,
    name: p.placeNameEn ?? p.name,
    place_name_en: p.placeNameEn ?? p.name,
    place_name_local: p.placeNameLocal,
    phone: p.phone ?? null,
    website: p.website ?? null,
    description: p.description ?? null,
    full_address: p.fullAddress ?? null,
    opening_hours: p.openingHours ?? null,
    business_status: p.businessStatus ?? null,
    review_count: p.reviewCount ?? null,
    google_photos: p.googlePhotos ?? null,
    thumbnail_url: thumb,
  })
  return { ...base, ...extra }
}

/**
 * Run PlaceFinder: parse query, fetch DB places, return ranked results.
 */
export async function runAskMapsQuery({ query, userLat, userLng, viewerId }) {
  const intent = enrichIntentFromQuery(await parseIntentWithGroq(query), query)

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

  if (radiusKm != null && !origin && Number.isFinite(userLat) && Number.isFinite(userLng)) {
    origin = { lat: userLat, lng: userLng }
    center = { lat: userLat, lng: userLng, name: 'Your location' }
  }

  if (radiusKm != null && !origin) {
    return {
      interpretation: `${intent.summary} (location required for distance search)`,
      intent: {
        category: intent.category,
        categories: intent.categories,
        locationType: intent.locationType,
        locationName: intent.locationName,
        radiusKm,
        filters: intent.filters,
        sortBy: intent.sortBy,
      },
      places: [],
      center,
      count: 0,
      aiEnabled: Boolean((process.env.GROQ_API_KEY || '').trim()),
    }
  }

  const whereParts = [placePublicVisibilityOr(viewerId)]

  const useRelaxedCategory = Boolean(
    origin && radiusKm != null && (intent.category || intent.categories?.length)
  )
  const categoryFilter = buildCategoryFilter(intent.category, intent.categories, {
    relaxed: useRelaxedCategory,
  })
  if (categoryFilter) whereParts.push(categoryFilter)

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

  // Radius + category: if strict/relaxed query still empty, scan all places in bbox
  const hasCategoryFilter = Boolean(intent.category || intent.categories?.length)
  if (rows.length === 0 && hasCategoryFilter && origin && radiusKm != null) {
    const delta = radiusKmToDelta(radiusKm)
    rows = await prisma.place.findMany({
      where: {
        AND: [
          placePublicVisibilityOr(viewerId),
          { latitude: { gte: origin.lat - delta, lte: origin.lat + delta } },
          { longitude: { gte: origin.lng - delta, lte: origin.lng + delta } },
        ],
      },
      take: 500,
      select: PLACE_SELECT,
    })
    rows = rows.filter((row) => placeMatchesCategoryIntent(row, intent))
  }

  // Named area + category often over-filters (0 rows); retry location-only in DB
  if (rows.length === 0 && hasCategoryFilter && intent.locationType === 'named' && intent.locationName) {
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

  // Last DB fallback: match words from the user's question (skip when radius search — avoids far-away matches)
  if (rows.length === 0 && radiusKm == null && String(query || '').trim().length >= 2) {
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

  if (hasCategoryFilter) {
    places = places.filter(({ row }) => placeMatchesCategoryIntent(row, intent))
  }

  if (origin && radiusKm != null) {
    const maxM = radiusKm * 1000
    places = places.filter(
      (x) => x.distanceMeters != null && Number.isFinite(x.distanceMeters) && x.distanceMeters <= maxM
    )
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

  // Serialize a generous slice of DB matches so external results can be merged
  // and re-ranked together; the merge step applies the final intent.limit.
  const dbPlaces = places
    .slice(0, Math.max(intent.limit, 50))
    .map(({ row, distanceMeters }) =>
      serializeAskPlace(row, {
        distanceMeters: distanceMeters != null ? Math.round(distanceMeters) : null,
      })
    )

  let limited = dbPlaces.slice(0, intent.limit)
  let externalCount = 0
  try {
    const merged = await mergeWithExternalPlaces(dbPlaces, {
      intent,
      query,
      origin,
      radiusKm,
    })
    limited = merged.places
    externalCount = merged.externalCount
  } catch (extErr) {
    console.warn('PlaceFinder external merge failed:', extErr.message)
  }

  const finalExternalCount = limited.filter((p) => p.source === 'external').length
  const finalDbCount = limited.length - finalExternalCount
  externalCount = finalExternalCount
  let interpretation = intent.summary
  if (finalExternalCount > 0 && finalDbCount > 0) {
    interpretation = `${intent.summary} (${finalDbCount} from UmnaApp + ${finalExternalCount} from OpenStreetMap)`
  } else if (finalExternalCount > 0) {
    interpretation = `${intent.summary} (${finalExternalCount} from OpenStreetMap)`
  } else if (finalDbCount > 0) {
    interpretation = `${intent.summary} (${finalDbCount} from UmnaApp)`
  }

  return {
    interpretation,
    intent: {
      category: intent.category,
      categories: intent.categories,
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
