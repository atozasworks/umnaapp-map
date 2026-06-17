/**
 * Client-side route list normalization (mirrors backend ranking for UI consistency).
 */

export function getRouteCoordinates(route) {
  const coords = route?.geometry?.coordinates
  return Array.isArray(coords) ? coords.filter((c) => Array.isArray(c) && c.length >= 2) : []
}

/** Midpoint along a route polyline for on-map labels. */
export function getRouteMidpoint(route) {
  const coords = getRouteCoordinates(route)
  if (coords.length === 0) return null
  if (coords.length === 1) return coords[0]
  const idx = Math.floor(coords.length / 2)
  return coords[idx]
}

/** Build a short "via …" summary from OSRM step names. */
export function extractRouteSummary(route) {
  const steps = route?.steps
  if (!Array.isArray(steps) || steps.length === 0) return route?.routeSummary || null

  const skip = /^(unnamed|road|street|lane|path|track|service)$/i
  const names = []
  for (const step of steps) {
    const name = (step.name || '').trim()
    if (!name || skip.test(name) || names.includes(name)) continue
    names.push(name)
    if (names.length >= 3) break
  }
  return names.length ? names.join(' · ') : route?.routeSummary || null
}

export function sortAndTagRoutes(routes) {
  if (!routes?.length) return []

  const sorted = [...routes].sort((a, b) => {
    const dur = (a.duration ?? 0) - (b.duration ?? 0)
    if (dur !== 0) return dur
    return (a.distance ?? 0) - (b.distance ?? 0)
  })

  const minDuration = Math.min(...sorted.map((r) => r.duration ?? Infinity))
  const minDistance = Math.min(...sorted.map((r) => r.distance ?? Infinity))

  return sorted.map((route, index) => {
    const routeTags = route.routeTags?.length ? [...route.routeTags] : []
    if (!routeTags.includes('recommended') && index === 0) routeTags.unshift('recommended')
    if (!routeTags.includes('fastest') && (route.duration ?? Infinity) <= minDuration) {
      routeTags.push('fastest')
    }
    if (!routeTags.includes('shortest') && (route.distance ?? Infinity) <= minDistance) {
      routeTags.push('shortest')
    }
    const summary = extractRouteSummary(route)
    return {
      ...route,
      routeIndex: index,
      routeTags,
      ...(summary ? { routeSummary: summary } : {}),
    }
  })
}

export function getRouteTagLabel(tag, translate) {
  if (tag === 'recommended') return translate('Recommended')
  if (tag === 'fastest') return translate('Fastest')
  if (tag === 'shortest') return translate('Shortest')
  return null
}

/** Format duration delta vs baseline, e.g. "+3 min" or "Same time". */
export function formatDurationDelta(durationSec, baselineSec) {
  if (!durationSec || !baselineSec) return null
  const diff = Math.round((durationSec - baselineSec) / 60)
  if (diff <= 0) return null
  return `+${diff} min`
}

/** Compact duration for on-map route badges. */
export function formatRouteDurationShort(seconds) {
  if (!seconds || seconds < 60) return '< 1 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0) return `${hours} hr ${minutes} min`
  return `${minutes} min`
}

/** Distinct polyline styles for alternative routes (Google Maps–like). */
export const ALT_ROUTE_STYLES = [
  { color: '#9CA3AF', width: 5, opacity: 0.55, dash: null },
  { color: '#6B7280', width: 5, opacity: 0.5, dash: [2, 2] },
  { color: '#94A3B8', width: 4, opacity: 0.45, dash: [4, 3] },
]

/** Ordered stops with coordinates: start → waypoints → end */
export function getResolvedRouteStops(startPlace, waypoints, endPlace) {
  const stops = []
  if (startPlace?.lat != null && startPlace?.lng != null) stops.push(startPlace)
  ;(waypoints || []).forEach((w) => {
    if (w.place?.lat != null && w.place?.lng != null) stops.push(w.place)
  })
  if (endPlace?.lat != null && endPlace?.lng != null) stops.push(endPlace)
  return stops
}

/** OSRM-style start, end, and intermediate waypoints from ordered stops */
export function buildRouteRequestFromStops(stops) {
  if (!stops || stops.length < 2) return null
  return {
    start: { lat: stops[0].lat, lng: stops[0].lng },
    end: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
    wp: stops.slice(1, -1).map((p) => ({ lat: p.lat, lng: p.lng })),
  }
}

/** Use GPS as implicit start when the user has not picked a start (Google Maps behaviour). */
export function getEffectiveStartPlace(startPlace, currentLocation, yourLocationLabel = 'Your location') {
  if (startPlace?.lat != null && startPlace?.lng != null) return startPlace
  if (currentLocation?.lat != null && currentLocation?.lng != null) {
    return {
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      name: currentLocation.name || yourLocationLabel,
    }
  }
  return null
}
