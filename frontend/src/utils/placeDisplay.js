/** Category colors for map markers and PlaceFinder chips. */
export const CATEGORY_MARKER_COLORS = {
  Restaurant: '#EF4444',
  Hospital: '#DC2626',
  Hotel: '#7C3AED',
  Parking: '#6366F1',
  Shop: '#8B5CF6',
  'Grocery Store': '#A855F7',
  School: '#3B82F6',
  Temple: '#F97316',
  Bank: '#059669',
  'Post Office': '#6366F1',
  'Bus Stop': '#0EA5E9',
  'Police Station': '#DC2626',
  'Petrol Pump': '#EAB308',
  'Tourist Place': '#EC4899',
  Transit: '#0EA5E9',
  Museum: '#14B8A6',
  Pharmacy: '#10B981',
  ATM: '#059669',
  Cinema: '#8B5CF6',
  Gym: '#EF4444',
  Salon: '#EC4899',
  Festival: '#D946EF',
  Other: '#0284C7',
}

export function markerColorForCategory(category) {
  return CATEGORY_MARKER_COLORS[category] || '#7C3AED'
}

/** Single-line address for list cards and subtitles. */
export function formatPlaceAddressLine(place) {
  if (!place) return ''
  const full = place.full_address || place.fullAddress
  if (full) return String(full).trim()
  const parts = [
    place.vicinity,
    place.village,
    place.taluk,
    place.district,
    place.state,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim())
  return parts.join(', ')
}

/** Google-cached photo URLs from stored JSON. */
export function getGooglePhotoUrls(place, max = 8) {
  const raw = place?.google_photos ?? place?.googlePhotos
  if (!Array.isArray(raw)) return []
  return raw
    .map((p) => (typeof p === 'string' ? p : p?.url))
    .filter(Boolean)
    .slice(0, max)
}

export function getPlaceThumbnail(place) {
  if (place?.thumbnail_url) return place.thumbnail_url
  const urls = getGooglePhotoUrls(place, 1)
  return urls[0] || null
}

/** Google-cached review snippets from stored JSON. */
export function getGoogleReviewsList(place) {
  const raw = place?.google_reviews ?? place?.googleReviews
  return Array.isArray(raw) ? raw : []
}

export function getStoredRating(place) {
  const r = place?.rating
  return r != null && Number.isFinite(Number(r)) ? Number(r) : null
}

export function getStoredReviewCount(place) {
  const c = place?.review_count ?? place?.reviewCount
  return c != null && Number.isFinite(Number(c)) ? Number(c) : null
}

export function isPlaceOpenNow(place) {
  const hours = place?.opening_hours ?? place?.openingHours
  if (hours && typeof hours.open_now === 'boolean') return hours.open_now
  const status = place?.business_status ?? place?.businessStatus
  if (status === 'CLOSED_PERMANENTLY' || status === 'CLOSED_TEMPORARILY') return false
  if (status === 'OPERATIONAL') return true
  return null
}

/** Cached nearby places JSON from Google extraction. */
export function getCachedNearbyPlaces(place) {
  const raw = place?.nearby_places ?? place?.nearbyPlaces
  return Array.isArray(raw) ? raw : []
}

const LOCAL_CATEGORY_PATTERNS = [
  { re: /\bhotels?\b|\blodging\b|\blodge\b|\bresort\b/i, category: 'Hotel', keywords: ['hotel', 'lodge', 'resort', 'inn', 'guest', 'homestay', 'lodging'] },
  { re: /\batms?\b/i, category: 'ATM', keywords: ['atm'] },
  { re: /\brestaurants?\b|\bfood\b|\bcafe\b/i, category: 'Restaurant', keywords: ['restaurant', 'food', 'cafe', 'dhaba'] },
  { re: /\bhospitals?\b|\bclinic\b/i, category: 'Hospital', keywords: ['hospital', 'clinic'] },
  { re: /\bpharmacy\b|\bchemist\b/i, category: 'Pharmacy', keywords: ['pharmacy', 'chemist'] },
  { re: /\btemples?\b|\bmasjid\b|\bmosque\b/i, category: 'Temple', keywords: ['temple', 'masjid', 'mosque', 'church'] },
]

function parseLocalRadiusKm(query) {
  const q = String(query || '').toLowerCase()
  const m = q.match(/\b(\d+(?:\.\d+)?)\s*(?:km|kms)\b/i)
  return m ? Math.min(50, Math.max(0.5, parseFloat(m[1]))) : null
}

function haversineMetersLocal(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function placeMatchesLocalQuery(place, pattern) {
  const hay = [
    place.category,
    place.name,
    place.place_name_en,
    place.placeNameEn,
    place.place_name_local,
    place.placeNameLocal,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (place.category && place.category.toLowerCase() === pattern.category.toLowerCase()) return true
  return pattern.keywords.some((kw) => hay.includes(kw))
}

/** When API returns empty, match places already visible on the user's map. */
export function supplementFromMapPlaces(apiPlaces, query, origin, mapPlaces = []) {
  if (!origin?.lat || !origin?.lng || !Array.isArray(mapPlaces) || mapPlaces.length === 0) {
    return apiPlaces
  }
  const q = String(query || '')
  const pattern = LOCAL_CATEGORY_PATTERNS.find((p) => p.re.test(q))
  if (!pattern) return apiPlaces

  const radiusKm = parseLocalRadiusKm(q) ?? 5
  const maxM = radiusKm * 1000
  const seen = new Set((apiPlaces || []).map((p) => `${Number(p.latitude).toFixed(5)}-${Number(p.longitude).toFixed(5)}`))
  const extras = []

  for (const place of mapPlaces) {
    const lat = place.latitude ?? place.lat
    const lng = place.longitude ?? place.lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const dist = haversineMetersLocal(origin.lat, origin.lng, lat, lng)
    if (dist > maxM) continue
    if (!placeMatchesLocalQuery(place, pattern)) continue
    const key = `${Number(lat).toFixed(5)}-${Number(lng).toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    extras.push({
      ...place,
      id: place.id,
      name: place.place_name_en || place.placeNameEn || place.name,
      place_name_en: place.place_name_en || place.placeNameEn || place.name,
      latitude: lat,
      longitude: lng,
      category: place.category || pattern.category,
      distanceMeters: Math.round(dist),
      source: place.source || 'map',
    })
  }

  extras.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
  return [...(apiPlaces || []), ...extras]
}
