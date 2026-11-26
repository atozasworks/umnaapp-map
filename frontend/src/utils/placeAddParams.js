/**
 * Shared "full parameter set" helpers for places added without Google
 * (Quick Survey, open-data Place Extractor), so they are stored with the same
 * fields as other places: zoom level, viewport/bounds, place type, vicinity,
 * full address, business status and extraction time.
 */

/** A place's own viewport: roughly one map tile around the point at this zoom. */
export function pointViewport(lat, lng, zoom = 17) {
  const z = Math.min(Math.max(Number(zoom) || 17, 3), 22)
  const halfLat = 180 / 2 ** z
  const halfLng = halfLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.2)
  return {
    north: lat + halfLat,
    south: lat - halfLat,
    east: lng + halfLng,
    west: lng - halfLng,
  }
}

/** "Mobile Repair" / "Grocery Store" → "mobile_repair" / "grocery_store". */
export function placeTypeSlug(text) {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug ? slug.slice(0, 100) : null
}

/** "Kadaba, Kadaba taluk, Dakshina Kannada, Karnataka 574221, India" from address parts. */
export function composeFullAddress({ street, village, taluk, district, state, pincode, country } = {}) {
  const clean = (v) => String(v || '').trim()
  const parts = []
  for (const value of [street, village, taluk, district]) {
    const v = clean(value)
    if (v && !parts.some((p) => p.toLowerCase() === v.toLowerCase())) parts.push(v)
  }
  const statePart = [clean(state), clean(pincode)].filter(Boolean).join(' ')
  if (statePart) parts.push(statePart)
  if (clean(country)) parts.push(clean(country))
  return parts.join(', ') || null
}

/** Short locality label ("Kadaba, Dakshina Kannada"). */
export function composeVicinity({ village, taluk, district } = {}) {
  const parts = [village, taluk, district].map((v) => String(v || '').trim()).filter(Boolean)
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i)
  return unique.slice(0, 2).join(', ') || null
}

/**
 * Minimal map-like object for extractMapRenderingConfig / withMapRenderingConfig
 * when there is no Google map: fixed zoom and plain bounds.
 */
export function staticMapContext(zoom, bounds) {
  return {
    getZoom: () => zoom,
    getBounds: () => bounds,
  }
}
