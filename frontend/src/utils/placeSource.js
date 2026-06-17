/** Place ID helpers shared across map UI. */

export function isPersistedPlaceId(id) {
  return Boolean(id && /^[0-9a-f-]{36}$/.test(String(id)))
}

export function isOsmPlaceId(id) {
  return /^osm-(node|way|relation)-/.test(String(id || ''))
}

export function isUnifiedPlaceId(id) {
  return isPersistedPlaceId(id) || isOsmPlaceId(id)
}

export function isOsmPlace(place) {
  if (!place) return false
  if (place.source === 'osm') return true
  return isOsmPlaceId(place.id ?? place.placeId)
}
