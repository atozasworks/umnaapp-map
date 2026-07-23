/**
 * Safe Route scoring — ranks OSRM alternatives using community hazards,
 * road-name heuristics, and optional avoid preferences.
 * Gracefully degrades to duration/distance ranking when hazard data is empty.
 */

export const HAZARD_TYPES = [
  'unsafe_road',
  'poor_lighting',
  'flood',
  'accident',
  'road_block',
  'harassment',
  'construction',
  'heavy_traffic',
  'safe_road',
]

export const DEFAULT_AVOID_OPTIONS = {
  avoidIsolatedRoads: true,
  avoidPoorlyLit: true,
  avoidFloodProne: true,
  avoidAccidentProne: true,
  avoidConstruction: true,
  avoidUnsafeAreas: true,
}

const AVOID_TYPE_MAP = {
  avoidPoorlyLit: ['poor_lighting'],
  avoidFloodProne: ['flood'],
  avoidAccidentProne: ['accident'],
  avoidConstruction: ['construction', 'road_block'],
  avoidUnsafeAreas: ['unsafe_road', 'harassment'],
}

const HAZARD_PENALTY = {
  unsafe_road: 14,
  poor_lighting: 10,
  flood: 18,
  accident: 16,
  road_block: 20,
  harassment: 18,
  construction: 12,
  heavy_traffic: 6,
  safe_road: -8,
}

const PROXIMITY_METERS = 90
const WARN_AHEAD_METERS = 250

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

function getRouteCoordinates(route) {
  const coords = route?.geometry?.coordinates
  return Array.isArray(coords) ? coords.filter((c) => Array.isArray(c) && c.length >= 2) : []
}

function sampleCoordinates(coords, maxPoints = 48) {
  if (!coords.length) return []
  if (coords.length <= maxPoints) return coords
  const step = (coords.length - 1) / (maxPoints - 1)
  const sampled = []
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(coords[Math.round(i * step)])
  }
  return sampled
}

function minDistanceToPolyline(pointLngLat, polyline) {
  let min = Infinity
  for (const p of polyline) {
    const d = haversineMeters(pointLngLat, p)
    if (d < min) min = d
  }
  return min
}

function nearestPointOnPolyline(pointLngLat, polyline) {
  let min = Infinity
  let nearest = null
  for (const p of polyline) {
    const d = haversineMeters(pointLngLat, p)
    if (d < min) {
      min = d
      nearest = p
    }
  }
  return { distance: min, point: nearest }
}

/** Heuristic: unnamed / track / path / service steps count as isolated. */
function analyzeRoadComposition(route) {
  const steps = Array.isArray(route?.steps) ? route.steps : []
  if (!steps.length) {
    return { isolatedRatio: 0.15, mainRoadRatio: 0.5, namedCount: 0, isolatedCount: 0 }
  }

  const skip = /^(unnamed|road|street|lane|path|track|service|alley|footway)$/i
  let isolated = 0
  let named = 0
  let main = 0

  for (const step of steps) {
    const name = (step.name || '').trim()
    const dist = Number(step.distance) || 0
    if (!name || skip.test(name)) {
      isolated += dist || 1
    } else {
      named += 1
      main += dist || 1
      if (/\b(highway|nh|sh|ring|bypass|avenue|main)\b/i.test(name)) {
        main += dist || 1
      }
    }
  }

  const total = Math.max(1, isolated + main)
  return {
    isolatedRatio: isolated / total,
    mainRoadRatio: main / total,
    namedCount: named,
    isolatedCount: Math.round(isolated / Math.max(1, steps.length)),
  }
}

function activeAvoidTypes(avoidOptions = {}) {
  const opts = { ...DEFAULT_AVOID_OPTIONS, ...avoidOptions }
  const types = new Set()
  for (const [key, list] of Object.entries(AVOID_TYPE_MAP)) {
    if (opts[key]) list.forEach((t) => types.add(t))
  }
  return { opts, types }
}

/**
 * Score a single route against hazards + heuristics.
 * @returns {{ safetyScore, riskySegments, alerts, safetyReasons, fuelEstimateLiters, roadComposition }}
 */
export function scoreRoute(route, hazards = [], avoidOptions = {}) {
  const coords = getRouteCoordinates(route)
  const sampled = sampleCoordinates(coords)
  const { opts, types: avoidTypes } = activeAvoidTypes(avoidOptions)
  const composition = analyzeRoadComposition(route)

  let score = 78
  const riskySegments = []
  const alerts = []
  const safeReasons = []
  const riskReasons = []
  const seenAlertKeys = new Set()
  let safeRoadBoosts = 0

  // Prefer main / named roads; penalize isolated stretches.
  const mainBoost = Math.round(composition.mainRoadRatio * 14)
  const isolatedPenalty = Math.round(
    composition.isolatedRatio * (opts.avoidIsolatedRoads ? 22 : 10)
  )
  score += mainBoost
  score -= isolatedPenalty

  if (mainBoost > 0) {
    safeReasons.push({
      id: 'main_roads',
      kind: 'safe',
      message: 'Uses mostly named or main roads',
      detail:
        composition.namedCount > 0
          ? `${composition.namedCount} named road segment${composition.namedCount === 1 ? '' : 's'}`
          : null,
      impact: mainBoost,
    })
  }
  if (isolatedPenalty > 0) {
    riskReasons.push({
      id: 'isolated_roads',
      kind: 'risk',
      message: 'Includes isolated or unnamed roads',
      detail: opts.avoidIsolatedRoads
        ? 'You asked to avoid isolated roads'
        : null,
      impact: -isolatedPenalty,
    })
  }

  const now = Date.now()
  for (const hazard of hazards) {
    if (!hazard || hazard.latitude == null || hazard.longitude == null) continue
    if (hazard.expiresAt && new Date(hazard.expiresAt).getTime() < now) continue

    const point = [Number(hazard.longitude), Number(hazard.latitude)]
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue
    if (!sampled.length) continue

    const { distance, point: nearest } = nearestPointOnPolyline(point, sampled)
    if (distance > PROXIMITY_METERS) continue

    const type = hazard.type || 'unsafe_road'
    const severity = Math.min(5, Math.max(1, Number(hazard.severity) || 3))
    let penalty = (HAZARD_PENALTY[type] ?? 10) * (0.6 + severity * 0.2)

    if (type === 'safe_road') {
      const boost = Math.round(-penalty) // penalty is negative → positive boost
      score -= penalty
      safeRoadBoosts += 1
      safeReasons.push({
        id: 'safe_road',
        kind: 'safe',
        message: 'Community marked this stretch as safer',
        detail: hazard.roadName || hazard.description || null,
        impact: boost,
        severity,
        latitude: hazard.latitude,
        longitude: hazard.longitude,
      })
      continue
    }

    if (avoidTypes.has(type)) {
      penalty *= 1.45
    }

    const impact = -Math.round(penalty)
    score -= penalty

    const seg = {
      type,
      severity,
      latitude: nearest?.[1] ?? hazard.latitude,
      longitude: nearest?.[0] ?? hazard.longitude,
      distanceMeters: Math.round(distance),
      hazardId: hazard.id || null,
      description: hazard.description || null,
      roadName: hazard.roadName || null,
    }
    riskySegments.push(seg)

    const alertKey = `${type}:${Math.round(hazard.latitude * 1000)}:${Math.round(hazard.longitude * 1000)}`
    if (!seenAlertKeys.has(alertKey)) {
      seenAlertKeys.add(alertKey)
      const message = alertMessageFor(type)
      alerts.push({
        type,
        severity,
        message,
        latitude: hazard.latitude,
        longitude: hazard.longitude,
      })
      riskReasons.push({
        id: type,
        kind: 'risk',
        type,
        message,
        detail:
          hazard.roadName ||
          hazard.description ||
          (severity >= 4 ? `High severity (${severity}/5)` : `Severity ${severity}/5`),
        impact,
        severity,
        distanceMeters: Math.round(distance),
        latitude: hazard.latitude,
        longitude: hazard.longitude,
      })
    }
  }

  if (riskySegments.length === 0 && safeRoadBoosts === 0) {
    safeReasons.push({
      id: 'no_hazards',
      kind: 'safe',
      message: 'No community hazard reports near this route',
      detail: null,
      impact: 0,
    })
  }

  // Slight preference for shorter exposure time on otherwise equal safety.
  const durationMin = (route.duration || 0) / 60
  if (durationMin > 90) {
    score -= 4
    riskReasons.push({
      id: 'long_trip',
      kind: 'risk',
      message: 'Longer trip increases time on the road',
      detail: 'Over 90 minutes',
      impact: -4,
    })
  } else if (durationMin > 45) {
    score -= 2
    riskReasons.push({
      id: 'long_trip',
      kind: 'risk',
      message: 'Longer trip increases time on the road',
      detail: 'Over 45 minutes',
      impact: -2,
    })
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  const distanceKm = (route.distance || 0) / 1000
  const fuelEstimateLiters = distanceKm > 0 ? Number((distanceKm * 0.08).toFixed(2)) : null

  return {
    safetyScore: score,
    riskySegmentCount: riskySegments.length,
    riskySegments,
    alerts,
    safetyReasons: {
      safe: safeReasons.slice(0, 6),
      risk: riskReasons.slice(0, 8),
    },
    fuelEstimateLiters,
    roadComposition: composition,
    dataAvailable: hazards.length > 0 || (Array.isArray(route?.steps) && route.steps.length > 0),
  }
}

function alertMessageFor(type) {
  switch (type) {
    case 'road_block':
      return 'Road closure reported ahead'
    case 'flood':
      return 'Flooded road reported ahead'
    case 'heavy_traffic':
      return 'Heavy traffic reported ahead'
    case 'accident':
      return 'Accident area reported ahead'
    case 'poor_lighting':
      return 'Poor lighting reported on this stretch'
    case 'construction':
      return 'Construction zone reported ahead'
    case 'harassment':
      return 'Community safety report nearby'
    case 'unsafe_road':
      return 'Unsafe road reported ahead'
    default:
      return 'Safety alert on this route'
  }
}

/**
 * Score and tag a list of alternative routes. Adds `safest` tag to the best.
 * Does not remove existing recommended/fastest/shortest tags.
 */
export function scoreAndTagRoutes(routes, hazards = [], avoidOptions = {}) {
  if (!Array.isArray(routes) || routes.length === 0) return []

  const scored = routes.map((route, index) => {
    const safety = scoreRoute(route, hazards, avoidOptions)
    const routeTags = Array.isArray(route.routeTags) ? [...route.routeTags] : []
    return {
      ...route,
      routeIndex: route.routeIndex ?? index,
      routeTags,
      safetyScore: safety.safetyScore,
      riskySegmentCount: safety.riskySegmentCount,
      riskySegments: safety.riskySegments,
      safetyAlerts: safety.alerts,
      safetyReasons: safety.safetyReasons,
      fuelEstimateLiters: safety.fuelEstimateLiters,
      roadComposition: safety.roadComposition,
      safetyDataAvailable: safety.dataAvailable,
    }
  })

  let bestIdx = 0
  let bestScore = -1
  scored.forEach((r, i) => {
    if (r.safetyScore > bestScore) {
      bestScore = r.safetyScore
      bestIdx = i
    } else if (r.safetyScore === bestScore) {
      // Tie-break: fewer risky segments, then shorter duration
      const cur = scored[bestIdx]
      if (
        (r.riskySegmentCount ?? 0) < (cur.riskySegmentCount ?? 0) ||
        ((r.riskySegmentCount ?? 0) === (cur.riskySegmentCount ?? 0) &&
          (r.duration ?? Infinity) < (cur.duration ?? Infinity))
      ) {
        bestIdx = i
      }
    }
  })

  if (!scored[bestIdx].routeTags.includes('safest')) {
    scored[bestIdx].routeTags.push('safest')
  }

  return scored
}

/** Bounding box around route polylines for hazard lookup. */
export function routesBoundingBox(routes, padDeg = 0.02) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const route of routes || []) {
    for (const c of getRouteCoordinates(route)) {
      const lng = c[0]
      const lat = c[1]
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
  }
  if (!Number.isFinite(minLat)) return null
  return {
    south: minLat - padDeg,
    north: maxLat + padDeg,
    west: minLng - padDeg,
    east: maxLng + padDeg,
  }
}

/** Warn if GPS is approaching a risky segment along the active route. */
export function findNearbyRiskWarning(location, riskySegments = [], radiusMeters = WARN_AHEAD_METERS) {
  if (!location || location.lat == null || location.lng == null) return null
  const here = [location.lng, location.lat]
  let closest = null
  for (const seg of riskySegments) {
    if (seg.latitude == null || seg.longitude == null) continue
    const d = haversineMeters(here, [seg.longitude, seg.latitude])
    if (d <= radiusMeters && (!closest || d < closest.distanceMeters)) {
      closest = { ...seg, distanceMeters: Math.round(d), message: alertMessageFor(seg.type) }
    }
  }
  return closest
}

export function serializeHazard(row) {
  if (!row) return null
  return {
    id: row.id,
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    severity: row.severity,
    description: row.description,
    roadName: row.roadName,
    status: row.status,
    expiresAt: row.expiresAt,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
    userId: row.userId,
    userName: row.user?.name || null,
  }
}
