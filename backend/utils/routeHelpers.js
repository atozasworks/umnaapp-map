/**
 * Normalize, deduplicate, and rank alternative routes from OSRM / umnaapp.
 */

const MAX_ALTERNATIVE_ROUTES = 3
const SIMILAR_ROUTE_METERS = 35
const SIMILAR_ROUTE_RATIO = 0.9

export function getRouteCoordinates(route) {
  const coords = route?.geometry?.coordinates
  return Array.isArray(coords) ? coords.filter((c) => Array.isArray(c) && c.length >= 2) : []
}

function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

function sampleCoordinates(coords, maxPoints = 24) {
  if (!coords.length) return []
  if (coords.length <= maxPoints) return coords
  const step = (coords.length - 1) / (maxPoints - 1)
  const sampled = []
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(coords[Math.round(i * step)])
  }
  return sampled
}

function minDistanceToPolyline(point, polyline) {
  let min = Infinity
  for (const p of polyline) {
    const d = haversineMeters(point, p)
    if (d < min) min = d
  }
  return min
}

export function routesAreSimilar(routeA, routeB) {
  const coordsA = getRouteCoordinates(routeA)
  const coordsB = getRouteCoordinates(routeB)
  if (coordsA.length < 2 || coordsB.length < 2) return false

  const durA = routeA.duration ?? 0
  const durB = routeB.duration ?? 0
  const distA = routeA.distance ?? 0
  const distB = routeB.distance ?? 0
  if (durA > 0 && durB > 0) {
    const durRatio = Math.min(durA, durB) / Math.max(durA, durB)
    const distRatio = Math.min(distA, distB) / Math.max(distA, distB)
    if (durRatio >= 0.98 && distRatio >= 0.98) return true
  }

  const sampleA = sampleCoordinates(coordsA)
  let closeCount = 0
  for (const point of sampleA) {
    if (minDistanceToPolyline(point, coordsB) <= SIMILAR_ROUTE_METERS) {
      closeCount += 1
    }
  }
  return closeCount / sampleA.length >= SIMILAR_ROUTE_RATIO
}

export function deduplicateRoutes(routes) {
  const unique = []
  for (const route of routes) {
    if (!getRouteCoordinates(route).length) continue
    const duplicate = unique.some((existing) => routesAreSimilar(existing, route))
    if (!duplicate) unique.push(route)
  }
  return unique
}

/** Build a short "via …" summary from OSRM step names (major roads only). */
export function extractRouteSummary(route) {
  const steps = route?.steps
  if (!Array.isArray(steps) || steps.length === 0) return null

  const skip = /^(unnamed|road|street|lane|path|track|service)$/i
  const names = []
  for (const step of steps) {
    const name = (step.name || '').trim()
    if (!name || skip.test(name) || names.includes(name)) continue
    names.push(name)
    if (names.length >= 3) break
  }
  return names.length ? names.join(' · ') : null
}

export function annotateRoutes(routes) {
  if (!routes.length) return []

  const sorted = [...routes].sort((a, b) => {
    const dur = (a.duration ?? 0) - (b.duration ?? 0)
    if (dur !== 0) return dur
    return (a.distance ?? 0) - (b.distance ?? 0)
  })

  const minDuration = Math.min(...sorted.map((r) => r.duration ?? Infinity))
  const minDistance = Math.min(...sorted.map((r) => r.distance ?? Infinity))

  return sorted.map((route, index) => {
    const routeTags = []
    if (index === 0) routeTags.push('recommended')
    if ((route.duration ?? Infinity) <= minDuration) routeTags.push('fastest')
    if ((route.distance ?? Infinity) <= minDistance) routeTags.push('shortest')
    const summary = extractRouteSummary(route)
    return {
      ...route,
      routeIndex: index,
      routeTags,
      ...(summary ? { routeSummary: summary } : {}),
    }
  })
}

export function processAlternativeRoutes(routes, { maxRoutes = MAX_ALTERNATIVE_ROUTES } = {}) {
  const valid = (Array.isArray(routes) ? routes : []).filter((r) => getRouteCoordinates(r).length >= 2)
  const deduped = deduplicateRoutes(valid)
  return annotateRoutes(deduped).slice(0, maxRoutes)
}

export function toRouteArray(routeData) {
  if (!routeData) return []
  return Array.isArray(routeData) ? routeData : [routeData]
}

export function hasMultipleRoutes(routeData) {
  return toRouteArray(routeData).length >= 2
}

/** Haversine distance in meters between [lat,lng] pairs. */
export function coordPairDistanceMeters(startLat, startLng, endLat, endLng) {
  return haversineMeters([startLng, startLat], [endLng, endLat])
}

/**
 * Straight-line fallback when routing engines return no path (unreachable graph, API down, etc.).
 */
export function buildDirectRoute(startLat, startLng, endLat, endLng, profile = 'driving') {
  const distance = coordPairDistanceMeters(startLat, startLng, endLat, endLng)
  const speeds = {
    walking: 1.25,
    cycling: 4.17,
    two_wheeler: 10.5,
    bus: 4.72,
    train: 13.89,
    driving: 8.33,
  }
  const speed = speeds[profile] ?? speeds.driving
  let duration = Math.max(30, Math.round(distance / speed))
  if (profile === 'bus') {
    duration += Math.min(900, Math.round(240 + distance / 650))
  } else if (profile === 'train') {
    duration += 14 * 60
    const railDistance = Math.round(distance * 1.32)
    return {
      distance: railDistance,
      duration: Math.max(30, Math.round(railDistance / speed + 14 * 60)),
      geometry: {
        type: 'LineString',
        coordinates: [
          [startLng, startLat],
          [endLng, endLat],
        ],
      },
      legs: [{ distance: railDistance, duration: Math.max(30, Math.round(railDistance / speed + 14 * 60)) }],
      steps: [],
      fallback: true,
    }
  }

  return {
    distance: Math.round(distance),
    duration,
    geometry: {
      type: 'LineString',
      coordinates: [
        [startLng, startLat],
        [endLng, endLat],
      ],
    },
    legs: [{ distance: Math.round(distance), duration }],
    steps: [],
    fallback: true,
  }
}
