/** Normalize incoming place body (extract / bulk / admin edit) into Prisma data fields. */

function str(v, max = 2000) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

function num(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function int(v) {
  const n = num(v)
  return n == null ? null : Math.round(n)
}

function jsonField(v) {
  if (v == null) return null
  if (typeof v === 'string') {
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  }
  if (typeof v === 'object') return v
  return null
}

/** Parse Google address_components into village/taluk/district/state/country/pincode. */
export function parseAddressComponents(components) {
  if (!Array.isArray(components)) return {}
  const byType = {}
  for (const c of components) {
    for (const t of c.types || []) {
      if (!byType[t]) byType[t] = c.long_name
    }
  }
  return {
    village:
      byType.locality ||
      byType.sublocality ||
      byType.sublocality_level_1 ||
      byType.neighborhood ||
      null,
    taluk: byType.administrative_area_level_3 || byType.administrative_area_level_2 || null,
    district: byType.administrative_area_level_2 || byType.administrative_area_level_1 || null,
    state: byType.administrative_area_level_1 || null,
    country: byType.country || null,
    pincode: byType.postal_code || null,
  }
}

/** Build DB fields from API / extraction payload. */
export function buildPlaceDetailFields(item, regionDefaults = {}, { forUpdate = false } = {}) {
  const addrParts =
    item.address_components || item.addressComponents
      ? parseAddressComponents(item.address_components || item.addressComponents)
      : {}

  const openingHours = jsonField(item.opening_hours ?? item.openingHours)
  const googleReviews = jsonField(item.google_reviews ?? item.googleReviews ?? item.reviews)
  const nearbyPlaces = jsonField(item.nearby_places ?? item.nearbyPlaces)
  const googlePhotos = jsonField(item.google_photos ?? item.googlePhotos ?? item.photos)

  const description =
    str(item.description) ||
    str(item.editorial_summary?.overview) ||
    str(item.editorialSummary?.overview) ||
    null

  let extractedAt
  if (item.extracted_at != null || item.extractedAt != null) {
    extractedAt = new Date(item.extracted_at ?? item.extractedAt)
  } else if (!forUpdate) {
    extractedAt = new Date()
  }

  const typesRaw = item.types ?? item.google_types ?? item.googleTypes
  const googleTypes = Array.isArray(typesRaw)
    ? typesRaw.map((t) => String(t).trim()).filter(Boolean)
    : null

  return {
    googlePlaceId: str(item.place_id ?? item.placeId ?? item.google_place_id ?? item.googlePlaceId, 255),
    googleType: str(item.type ?? item.google_type ?? item.googleType ?? googleTypes?.[0], 100),
    googleTypes: googleTypes?.length ? googleTypes : null,
    googleMapsUrl: str(item.maps_url ?? item.google_maps_url ?? item.googleMapsUrl ?? item.url, 500),
    vicinity: str(item.vicinity, 500),
    fullAddress: str(item.address ?? item.full_address ?? item.fullAddress ?? item.formatted_address, 2000),
    village: str(item.village ?? addrParts.village ?? regionDefaults.village, 200),
    taluk: str(item.taluk ?? addrParts.taluk ?? regionDefaults.taluk, 200),
    district: str(item.district ?? addrParts.district ?? regionDefaults.district, 200),
    state: str(item.state ?? addrParts.state ?? regionDefaults.state, 200),
    country: str(item.country ?? addrParts.country ?? regionDefaults.country, 200),
    pincode: str(item.pincode ?? addrParts.pincode, 20),
    phone: str(item.phone ?? item.formatted_phone_number ?? item.international_phone_number, 50),
    website: str(item.website, 500),
    rating: num(item.rating),
    reviewCount: int(item.review_count ?? item.reviewCount ?? item.user_ratings_total),
    openingHours,
    businessStatus: str(item.business_status ?? item.businessStatus, 50),
    description,
    googleReviews,
    nearbyPlaces,
    googlePhotos,
    ...(extractedAt && !Number.isNaN(extractedAt.getTime()) ? { extractedAt } : {}),
  }
}

/** API response shape for admin / detail views. */
export function serializePlace(p) {
  if (!p) return null
  return {
    id: p.id,
    name: p.placeNameEn ?? p.name,
    place_name_en: p.placeNameEn ?? p.name,
    place_name_local: p.placeNameLocal,
    category: p.category,
    latitude: p.latitude,
    longitude: p.longitude,
    zoomLevel: p.zoomLevel,
    userId: p.userId,
    user_name: p.userName,
    user_email: p.userEmail,
    source: p.source,
    approvalStatus: p.approvalStatus,
    approvedAt: p.approvedAt,
    auto_approve_at: p.autoApproveAt,
    google_place_id: p.googlePlaceId,
    google_type: p.googleType,
    google_types: p.googleTypes,
    google_maps_url: p.googleMapsUrl,
    vicinity: p.vicinity,
    full_address: p.fullAddress,
    village: p.village,
    taluk: p.taluk,
    district: p.district,
    state: p.state,
    country: p.country,
    pincode: p.pincode,
    phone: p.phone,
    website: p.website,
    rating: p.rating,
    review_count: p.reviewCount,
    opening_hours: p.openingHours,
    business_status: p.businessStatus,
    description: p.description,
    google_reviews: p.googleReviews,
    nearby_places: p.nearbyPlaces,
    google_photos: p.googlePhotos,
    extracted_at: p.extractedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

export const PLACE_DETAIL_SELECT = {
  id: true,
  name: true,
  placeNameEn: true,
  placeNameLocal: true,
  category: true,
  latitude: true,
  longitude: true,
  zoomLevel: true,
  userId: true,
  userName: true,
  userEmail: true,
  source: true,
  approvalStatus: true,
  approvedAt: true,
  autoApproveAt: true,
  googlePlaceId: true,
  googleType: true,
  googleTypes: true,
  googleMapsUrl: true,
  vicinity: true,
  fullAddress: true,
  village: true,
  taluk: true,
  district: true,
  state: true,
  country: true,
  pincode: true,
  phone: true,
  website: true,
  rating: true,
  reviewCount: true,
  openingHours: true,
  businessStatus: true,
  description: true,
  googleReviews: true,
  nearbyPlaces: true,
  googlePhotos: true,
  extractedAt: true,
  createdAt: true,
  updatedAt: true,
}
