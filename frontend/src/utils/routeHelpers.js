/**
 * Client-side route list normalization (mirrors backend ranking for UI consistency).
 */

export function getRouteCoordinates(route) {
  const coords = route?.geometry?.coordinates
  return Array.isArray(coords) ? coords.filter((c) => Array.isArray(c) && c.length >= 2) : []
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
    const routeTags = route.routeTags?.length
      ? route.routeTags
      : []
    if (!routeTags.length) {
      if ((route.duration ?? Infinity) <= minDuration) routeTags.push('fastest')
      if ((route.distance ?? Infinity) <= minDistance) routeTags.push('shortest')
    }
    return { ...route, routeIndex: index, routeTags }
  })
}

export function getRouteTagLabel(tag, translate) {
  if (tag === 'fastest') return translate('Fastest')
  if (tag === 'shortest') return translate('Shortest')
  return null
}

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
