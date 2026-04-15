/**
 * Geo helpers for area explore: point-in-polygon, ring closure, light decimation.
 * Coordinates are [lng, lat] per GeoJSON.
 */

export function pointInRing(lng, lat, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false
  const r =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring
  let inside = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0]
    const yi = r[i][1]
    const xj = r[j][0]
    const yj = r[j][1]
    const denom = yj - yi || 1e-12
    const intersect = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / denom + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function pointInPolygonFeature(lng, lat, feature) {
  const geom = feature?.geometry
  if (!geom || geom.type !== 'Polygon' || !Array.isArray(geom.coordinates?.[0])) return false
  return pointInRing(lng, lat, geom.coordinates[0])
}

export function closeRing(coords) {
  if (!coords?.length) return []
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) return coords
  return [...coords, [...first]]
}

export function ringBBox(ring) {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of ring) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }
  return { minLng, maxLng, minLat, maxLat }
}

const R = 6371000
const toRad = (d) => (d * Math.PI) / 180

export function haversineMeters(a, b) {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function circlePolygon(centerLng, centerLat, radiusM, points = 64) {
  const coordinates = []
  const latRad = (centerLat * Math.PI) / 180
  const metersPerDegLat = 111320
  const metersPerDegLng = 111320 * Math.cos(latRad || 0.0001)

  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2
    const dx = Math.cos(angle) * radiusM
    const dy = Math.sin(angle) * radiusM
    coordinates.push([centerLng + dx / metersPerDegLng, centerLat + dy / metersPerDegLat])
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  }
}

/** Axis-aligned rectangle from two corners (lng/lat). */
export function rectangleFromCorners(a, b) {
  const minLng = Math.min(a[0], b[0])
  const maxLng = Math.max(a[0], b[0])
  const minLat = Math.min(a[1], b[1])
  const maxLat = Math.max(a[1], b[1])
  const ring = [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ]
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}

/** Square in geographic space: same center as bbox, side = min(width, height) in meters. */
export function squareFromCorners(a, b) {
  const minLng = Math.min(a[0], b[0])
  const maxLng = Math.max(a[0], b[0])
  const minLat = Math.min(a[1], b[1])
  const maxLat = Math.max(a[1], b[1])
  const midLng = (minLng + maxLng) / 2
  const midLat = (minLat + maxLat) / 2
  const wM = haversineMeters([minLng, midLat], [maxLng, midLat])
  const hM = haversineMeters([midLng, minLat], [midLng, maxLat])
  const sideM = Math.max(1, Math.min(wM, hM))
  const latRad = (midLat * Math.PI) / 180
  const metersPerDegLat = 111320
  const metersPerDegLng = 111320 * Math.cos(latRad || 0.0001)
  const halfLat = sideM / 2 / metersPerDegLat
  const halfLng = sideM / 2 / metersPerDegLng
  const ring = [
    [midLng - halfLng, midLat - halfLat],
    [midLng + halfLng, midLat - halfLat],
    [midLng + halfLng, midLat + halfLat],
    [midLng - halfLng, midLat + halfLat],
    [midLng - halfLng, midLat - halfLat],
  ]
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}

/** Remove points closer than minDistM (approximate, along segments). */
export function decimateRingMeters(ring, minDistM = 4) {
  if (!ring || ring.length < 4) return ring
  const open = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring
  const out = [open[0]]
  for (let i = 1; i < open.length; i += 1) {
    if (haversineMeters(out[out.length - 1], open[i]) >= minDistM) {
      out.push(open[i])
    }
  }
  if (out.length < 3) return ring
  return closeRing(out)
}
