/**
 * Geometry helpers for turn-by-turn navigation.
 *
 * Everything works in GeoJSON [lng, lat] order to match the route geometry
 * coming from the backend (OSRM-style). Distances are in meters.
 */

const EARTH_RADIUS_M = 6371000
const toRad = (deg) => (deg * Math.PI) / 180
const toDeg = (rad) => (rad * 180) / Math.PI

/** Great-circle distance between two [lng, lat] points (meters). */
export function haversineMeters(a, b) {
  if (!a || !b) return Infinity
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from point a to b in degrees (0-360, 0 = north). */
export function bearingDegrees(a, b) {
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const dLng = toRad(b[0] - a[0])
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/**
 * Local equirectangular projection around `origin` lat. Cheap and accurate
 * enough for the short segment math used while navigating.
 */
function project(point, originLatRad) {
  const x = toRad(point[0]) * Math.cos(originLatRad) * EARTH_RADIUS_M
  const y = toRad(point[1]) * EARTH_RADIUS_M
  return [x, y]
}

/**
 * Closest point on segment [p1, p2] to point p. Returns { point, t, distance }
 * where t is the 0..1 parameter along the segment and distance is meters.
 */
function nearestOnSegment(p, p1, p2) {
  const originLatRad = toRad(p[1])
  const a = project(p1, originLatRad)
  const b = project(p2, originLatRad)
  const pt = project(p, originLatRad)

  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy

  let t = 0
  if (lenSq > 0) {
    t = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
  }

  const snapped = [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]
  return { point: snapped, t, distance: haversineMeters(p, snapped) }
}

/** Cumulative distance (meters) from start of `coords` to each vertex. */
export function buildCumulativeDistances(coords) {
  const cum = new Array(coords.length).fill(0)
  for (let i = 1; i < coords.length; i += 1) {
    cum[i] = cum[i - 1] + haversineMeters(coords[i - 1], coords[i])
  }
  return cum
}

/**
 * Snap a [lng, lat] location to a route polyline.
 *
 * @param {number[]} location  [lng, lat]
 * @param {number[][]} coords   route geometry coordinates
 * @param {number[]} cum        precomputed cumulative distances (optional)
 * @returns {{ snapped: number[], distanceToRoute: number, distanceAlong: number,
 *   segmentIndex: number }}
 */
export function snapToRoute(location, coords, cum) {
  if (!coords || coords.length < 2) {
    return { snapped: location, distanceToRoute: 0, distanceAlong: 0, segmentIndex: 0 }
  }
  const cumulative = cum || buildCumulativeDistances(coords)

  let best = {
    distanceToRoute: Infinity,
    distanceAlong: 0,
    snapped: coords[0],
    segmentIndex: 0,
  }

  for (let i = 0; i < coords.length - 1; i += 1) {
    const seg = nearestOnSegment(location, coords[i], coords[i + 1])
    if (seg.distance < best.distanceToRoute) {
      const along = cumulative[i] + haversineMeters(coords[i], seg.point)
      best = {
        distanceToRoute: seg.distance,
        distanceAlong: along,
        snapped: seg.point,
        segmentIndex: i,
      }
    }
  }
  return best
}

/** Index of the coordinate nearest to `point` (used to map maneuvers to vertices). */
export function nearestVertexIndex(point, coords) {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < coords.length; i += 1) {
    const d = haversineMeters(point, coords[i])
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return bestIdx
}

/** Bearing of the route a little ahead of `segmentIndex` (for camera heading). */
export function routeBearingAhead(coords, segmentIndex) {
  const i = Math.max(0, Math.min(segmentIndex, coords.length - 2))
  let j = i + 1
  // Look ahead until the points are far enough apart to give a stable bearing.
  while (j < coords.length - 1 && haversineMeters(coords[i], coords[j]) < 12) {
    j += 1
  }
  return bearingDegrees(coords[i], coords[j])
}
