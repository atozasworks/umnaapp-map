/** Client-side duplicate checks (mirrors backend rules; DB is source of truth). */

export const COORD_EPS = 0.0001

export const DUPLICATE_MESSAGES = {
  google_place_id: 'Place already added',
  coordinates: 'This location already exists in the map',
  name_address: 'Place already added',
  duplicate_in_batch: 'Duplicate in selection',
}

function collapseWs(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizePlaceName(name) {
  return collapseWs(name).replace(/[^\p{L}\p{N}\s]/gu, '')
}

export function normalizeAddress(address) {
  return collapseWs(address).replace(/[^\p{L}\p{N}\s,]/gu, '')
}

export function addressFromParts(parts = {}) {
  return [parts.village, parts.taluk, parts.district, parts.state, parts.country, parts.pincode]
    .filter(Boolean)
    .join(', ')
}

export function candidateFromPlace(item = {}) {
  const lat = parseFloat(item.lat ?? item.latitude)
  const lng = parseFloat(item.lng ?? item.longitude)
  const name = String(item.name || item.place_name_en || '').trim()
  const address = String(
    item.address ||
      item.full_address ||
      item.fullAddress ||
      addressFromParts(item) ||
      ''
  ).trim()

  return {
    lat,
    lng,
    googlePlaceId:
      String(item.place_id || item.placeId || item.google_place_id || item.googlePlaceId || '').trim() ||
      null,
    name,
    address,
    nameKey: normalizePlaceName(name),
    addressKey: normalizeAddress(address),
  }
}

function coordsMatch(aLat, aLng, bLat, bLng) {
  return Math.abs(aLat - bLat) < COORD_EPS && Math.abs(aLng - bLng) < COORD_EPS
}

function dbRowCandidate(p) {
  const address =
    p.full_address ||
    addressFromParts({
      village: p.village,
      taluk: p.taluk,
      district: p.district,
      state: p.state,
      country: p.country,
      pincode: p.pincode,
    })
  return candidateFromPlace({
    lat: p.latitude,
    lng: p.longitude,
    place_id: p.google_place_id || p.googlePlaceId,
    name: p.place_name_en || p.name,
    address,
  })
}

/** Match candidate against places already on the map / in DB list. */
export function findDuplicateInList(existingPlaces, candidate, { excludePlaceId = null } = {}) {
  const c = candidateFromPlace(candidate)
  const list = Array.isArray(existingPlaces) ? existingPlaces : []

  for (const p of list) {
    if (excludePlaceId != null && String(p.id) === String(excludePlaceId)) continue
    const e = dbRowCandidate(p)

    if (c.googlePlaceId && e.googlePlaceId && c.googlePlaceId === e.googlePlaceId) {
      return { duplicate: true, reason: 'google_place_id', message: DUPLICATE_MESSAGES.google_place_id }
    }
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng) && coordsMatch(c.lat, c.lng, e.lat, e.lng)) {
      return { duplicate: true, reason: 'coordinates', message: DUPLICATE_MESSAGES.coordinates }
    }
    if (c.nameKey && c.addressKey && c.nameKey === e.nameKey && c.addressKey === e.addressKey) {
      return { duplicate: true, reason: 'name_address', message: DUPLICATE_MESSAGES.name_address }
    }
  }
  return { duplicate: false }
}

export function isDuplicateInSession(sessionList, candidate) {
  const c = candidateFromPlace(candidate)
  return sessionList.some((p) => {
    const s = candidateFromPlace(p)
    return (
      (c.googlePlaceId && s.googlePlaceId && c.googlePlaceId === s.googlePlaceId) ||
      (Number.isFinite(c.lat) && Number.isFinite(c.lng) && coordsMatch(c.lat, c.lng, s.lat, s.lng)) ||
      (c.nameKey && c.addressKey && c.nameKey === s.nameKey && c.addressKey === s.addressKey)
    )
  })
}
