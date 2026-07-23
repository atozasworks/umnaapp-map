/**
 * Client helpers for Safe Route Navigation (mirrors backend scoring labels).
 */

export const HAZARD_REPORT_TYPES = [
  { id: 'unsafe_road', label: 'Unsafe road' },
  { id: 'poor_lighting', label: 'Poor lighting' },
  { id: 'flood', label: 'Flood' },
  { id: 'accident', label: 'Accident' },
  { id: 'road_block', label: 'Road block' },
  { id: 'harassment', label: 'Harassment or suspicious activity' },
  { id: 'construction', label: 'Construction zone' },
  { id: 'heavy_traffic', label: 'Heavy traffic' },
]

export const DEFAULT_SAFE_AVOID_OPTIONS = {
  avoidIsolatedRoads: true,
  avoidPoorlyLit: true,
  avoidFloodProne: true,
  avoidAccidentProne: true,
  avoidConstruction: true,
  avoidUnsafeAreas: true,
}

export const SAFE_AVOID_OPTION_META = [
  { key: 'avoidIsolatedRoads', label: 'Avoid isolated roads' },
  { key: 'avoidPoorlyLit', label: 'Avoid poorly lit roads' },
  { key: 'avoidFloodProne', label: 'Avoid flood-prone roads' },
  { key: 'avoidAccidentProne', label: 'Avoid accident-prone roads' },
  { key: 'avoidConstruction', label: 'Avoid construction zones' },
  { key: 'avoidUnsafeAreas', label: 'Avoid unsafe areas' },
]

/** Distinct colors when Safe Route mode labels Fastest / Shortest / Safest. */
export const SAFE_ROUTE_TAG_COLORS = {
  fastest: '#2563EB',
  shortest: '#7C3AED',
  safest: '#059669',
  recommended: '#1967d2',
}

export const SAFE_ALT_ROUTE_STYLES = [
  { color: '#059669', width: 6, opacity: 0.85, dash: null },
  { color: '#2563EB', width: 5, opacity: 0.55, dash: null },
  { color: '#7C3AED', width: 5, opacity: 0.5, dash: [2, 2] },
]

export function safetyScoreColor(score) {
  if (score >= 80) return '#059669'
  if (score >= 60) return '#CA8A04'
  if (score >= 40) return '#EA580C'
  return '#DC2626'
}

export function formatSafetyScore(score) {
  if (!Number.isFinite(score)) return '—'
  return `${Math.round(score)}`
}

export function estimateFuelLiters(distanceMeters, travelMode = 'driving') {
  if (!distanceMeters || distanceMeters <= 0) return null
  const km = distanceMeters / 1000
  const rates = {
    driving: 0.08,
    two_wheeler: 0.035,
    bus: 0.12,
    train: 0,
    walking: 0,
    cycling: 0,
  }
  const rate = rates[travelMode]
  if (!rate) return null
  return Number((km * rate).toFixed(2))
}

export function hazardTypeLabel(type) {
  const found = HAZARD_REPORT_TYPES.find((t) => t.id === type)
  if (found) return found.label
  if (type === 'safe_road') return 'Community safe road'
  if (type === 'construction') return 'Construction'
  if (type === 'heavy_traffic') return 'Heavy traffic'
  return type || 'Hazard'
}

/**
 * Normalize why-safe / why-risk details from a scored route.
 * Prefers backend `safetyReasons`; falls back to alerts + road composition.
 */
export function getRouteSafetyDetails(route) {
  if (!route) return { safe: [], risk: [] }

  const fromApi = route.safetyReasons
  if (fromApi && (fromApi.safe?.length || fromApi.risk?.length)) {
    return {
      safe: Array.isArray(fromApi.safe) ? fromApi.safe : [],
      risk: Array.isArray(fromApi.risk) ? fromApi.risk : [],
    }
  }

  const safe = []
  const risk = []
  const composition = route.roadComposition
  if (composition?.mainRoadRatio >= 0.45) {
    safe.push({
      id: 'main_roads',
      message: 'Uses mostly named or main roads',
      detail: null,
      impact: null,
    })
  }
  if (composition?.isolatedRatio >= 0.25) {
    risk.push({
      id: 'isolated_roads',
      message: 'Includes isolated or unnamed roads',
      detail: null,
      impact: null,
    })
  }

  const alerts = route.safetyAlerts || route.alerts || []
  for (const alert of alerts) {
    risk.push({
      id: alert.type || 'hazard',
      type: alert.type,
      message: alert.message || hazardTypeLabel(alert.type),
      detail: alert.severity ? `Severity ${alert.severity}/5` : null,
      impact: null,
      severity: alert.severity,
    })
  }

  if (risk.length === 0 && Number.isFinite(route.safetyScore) && route.safetyScore >= 70) {
    safe.push({
      id: 'no_hazards',
      message: 'No community hazard reports near this route',
      detail: null,
      impact: null,
    })
  }

  return { safe, risk }
}

export function formatSafetyImpact(impact) {
  if (!Number.isFinite(impact) || impact === 0) return null
  return impact > 0 ? `+${impact}` : `${impact}`
}

/** Pick primary display tag for a route chip when Safe Route is on. */
export function primarySafeRouteTag(routeTags = []) {
  if (routeTags.includes('safest')) return 'safest'
  if (routeTags.includes('fastest')) return 'fastest'
  if (routeTags.includes('shortest')) return 'shortest'
  if (routeTags.includes('recommended')) return 'recommended'
  return null
}

/** Styles array ordered to match alt route indices for map drawing. */
export function buildSafeRouteMapStyles(routes) {
  return (routes || []).map((route) => {
    const tag = primarySafeRouteTag(route.routeTags)
    if (tag === 'safest') return SAFE_ALT_ROUTE_STYLES[0]
    if (tag === 'fastest') return SAFE_ALT_ROUTE_STYLES[1]
    if (tag === 'shortest') return SAFE_ALT_ROUTE_STYLES[2]
    return SAFE_ALT_ROUTE_STYLES[1]
  })
}
