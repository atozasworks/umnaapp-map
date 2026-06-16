/** Provenance labels for places from local DB, OSM DB, or HTTP geocoders. */

export const PLACE_SOURCES = {
  CONTRIBUTION: 'contribution',
  SAVED: 'saved',
  OSM: 'osm',
  EXTERNAL: 'external',
}

/** Persisted in the application Place table. */
export function isPersistedSource(source) {
  return source === PLACE_SOURCES.CONTRIBUTION || source === PLACE_SOURCES.SAVED
}

export function makeOsmPlaceId(osmType, osmId) {
  const type =
    osmType === 'way' || osmType === 'relation' ? osmType : 'node'
  return `osm-${type}-${osmId}`
}

export function parseOsmPlaceId(id) {
  const m = String(id || '').match(/^osm-(node|way|relation)-(-?\d+)$/)
  if (!m) return null
  return { osmType: m[1], osmId: parseInt(m[2], 10) }
}

export function isOsmPlaceId(id) {
  return /^osm-(node|way|relation)-/.test(String(id || ''))
}

/** Stable external id for dedupe across HTTP providers. */
export function externalSourceId(row) {
  if (row.osm_id != null) {
    const t = row.osm_type || row.type || 'node'
    return makeOsmPlaceId(t, row.osm_id)
  }
  if (row.place_id != null) return `ext-place-${row.place_id}`
  const lat = parseFloat(row.lat)
  const lng = parseFloat(row.lon ?? row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `ext-coord-${lat.toFixed(5)}-${lng.toFixed(5)}`
  }
  return null
}
