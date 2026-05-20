/** Server-side normalization for map_rendering_config JSON column. */

function num(v, fallback = null) {
  if (v == null || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function jsonField(v) {
  if (v == null) return null
  if (typeof v === 'string') {
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  }
  if (typeof v === 'object') return v
  return null
}

/** Accept mapRenderingConfig / map_rendering_config from client; sanitize and cap size. */
export function normalizeMapRenderingConfig(raw, { zoomLevel = 15 } = {}) {
  const cfg = jsonField(raw)
  if (!cfg || typeof cfg !== 'object') {
    return buildDefaultMapRenderingConfig({ zoomLevel })
  }

  const zl = num(cfg.zoomLevel, zoomLevel) ?? 15

  return {
    version: num(cfg.version, 1) ?? 1,
    zoomLevel: zl,
    minZoom: clamp(num(cfg.minZoom, 3) ?? 3, 0, 22),
    maxZoom: clamp(num(cfg.maxZoom, 22) ?? 22, 0, 22),
    visibility: cfg.visibility !== false,
    featureType: String(cfg.featureType || 'poi').slice(0, 32),
    elementType: String(cfg.elementType || 'labels').slice(0, 32),
    bounds: sanitizeBounds(cfg.bounds),
    viewport: sanitizeBounds(cfg.viewport),
    scale: clamp(num(cfg.scale, 1) ?? 1, 0.1, 4),
    tileLevel: clamp(num(cfg.tileLevel, Math.floor(zl)) ?? Math.floor(zl), 0, 22),
    lod: clamp(num(cfg.lod, 2) ?? 2, 0, 4),
    clustering: sanitizeClustering(cfg.clustering),
    decluttering: sanitizeDecluttering(cfg.decluttering),
    priority: clamp(num(cfg.priority, 50) ?? 50, 0, 200),
    density: clamp(num(cfg.density, 1) ?? 1, 0.1, 2),
    styleRules: Array.isArray(cfg.styleRules) ? cfg.styleRules.slice(0, 24) : [],
    labelCollisionHandling: String(cfg.labelCollisionHandling || 'declutter').slice(0, 32),
    vectorTileLayers: Array.isArray(cfg.vectorTileLayers) ? cfg.vectorTileLayers.slice(0, 16) : [],
    simplification: clamp(num(cfg.simplification, 0.5) ?? 0.5, 0, 1),
    opacity: clamp(num(cfg.opacity, 1) ?? 1, 0, 1),
    iconSizeScaling: sanitizeScaling(cfg.iconSizeScaling),
    textSizeScaling: sanitizeScaling(cfg.textSizeScaling),
    zIndex: clamp(num(cfg.zIndex, 100) ?? 100, 0, 1000),
    labelZoomStart: clamp(num(cfg.labelZoomStart, 10.5) ?? 10.5, 0, 22),
    labelZoomFull: clamp(num(cfg.labelZoomFull, 13) ?? 13, 0, 22),
    mapTypeId: cfg.mapTypeId != null ? String(cfg.mapTypeId).slice(0, 32) : null,
    extractedAt: cfg.extractedAt || new Date().toISOString(),
  }
}

function sanitizeBounds(b) {
  const box = jsonField(b) || b
  if (!box || typeof box !== 'object') return null
  const north = num(box.north)
  const south = num(box.south)
  const east = num(box.east)
  const west = num(box.west)
  if (north == null || south == null || east == null || west == null) return null
  return { north, south, east, west }
}

function sanitizeClustering(c) {
  const cl = jsonField(c) || c || {}
  return {
    enabled: cl.enabled !== false,
    radius: clamp(num(cl.radius, 48) ?? 48, 8, 120),
    maxZoom: clamp(num(cl.maxZoom, 14) ?? 14, 0, 22),
    minPoints: clamp(num(cl.minPoints, 2) ?? 2, 2, 20),
  }
}

function sanitizeDecluttering(d) {
  const dc = jsonField(d) || d || {}
  return {
    enabled: dc.enabled !== false,
    minZoom: clamp(num(dc.minZoom, 11) ?? 11, 0, 22),
    priorityThreshold: clamp(num(dc.priorityThreshold, 0.45) ?? 0.45, 0, 1),
    maxLabels: clamp(num(dc.maxLabels, 48) ?? 48, 1, 200),
  }
}

function sanitizeScaling(s) {
  const sc = jsonField(s) || s || {}
  return {
    baseZoom: clamp(num(sc.baseZoom, 15) ?? 15, 0, 22),
    min: clamp(num(sc.min, 0.7) ?? 0.7, 0.3, 2),
    max: clamp(num(sc.max, 1.25) ?? 1.25, 0.3, 2),
    factor: clamp(num(sc.factor, 0.08) ?? 0.08, 0, 0.5),
  }
}

export function buildDefaultMapRenderingConfig({ zoomLevel = 15, featureType = 'poi' } = {}) {
  const zl = num(zoomLevel, 15) ?? 15
  return normalizeMapRenderingConfig(
    {
      zoomLevel: zl,
      featureType,
      elementType: 'labels',
      visibility: true,
      priority: 50,
      clustering: { enabled: zl < 14, radius: 48, maxZoom: 14 },
      decluttering: {
        enabled: true,
        minZoom: 11,
        maxLabels: zl < 13 ? 28 : 80,
      },
    },
    { zoomLevel: zl }
  )
}
