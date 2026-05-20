/**
 * Google Maps–style map rendering configuration for places.
 * Extracted during import, stored in DB (map_rendering_config), applied on MapLibre display.
 */

const CONFIG_VERSION = 1

/** Google place types → map style featureType */
const GOOGLE_TYPE_TO_FEATURE = {
  route: 'road',
  street_address: 'road',
  locality: 'administrative',
  administrative_area_level_1: 'administrative',
  administrative_area_level_2: 'administrative',
  country: 'administrative',
  transit_station: 'transit',
  bus_station: 'transit',
  train_station: 'transit',
  subway_station: 'transit',
  natural_feature: 'landscape',
  park: 'landscape',
  point_of_interest: 'poi',
  establishment: 'poi',
  tourist_attraction: 'landmark',
  museum: 'landmark',
  church: 'landmark',
  hindu_temple: 'landmark',
  mosque: 'landmark',
  hospital: 'poi',
  school: 'poi',
  restaurant: 'poi',
  lodging: 'poi',
  store: 'poi',
  shopping_mall: 'poi',
}

const CATEGORY_TO_FEATURE = {
  Hospital: 'poi',
  'Police Station': 'poi',
  Pharmacy: 'poi',
  School: 'poi',
  Bank: 'poi',
  'Post Office': 'poi',
  'Bus Stop': 'transit',
  Transit: 'transit',
  Restaurant: 'poi',
  Hotel: 'poi',
  'Tourist Place': 'landmark',
  Museum: 'landmark',
  Temple: 'landmark',
  Shop: 'poi',
  'Grocery Store': 'poi',
  Parking: 'poi',
  'Petrol Pump': 'poi',
}

const CATEGORY_PRIORITY = {
  Hospital: 110,
  'Police Station': 108,
  Pharmacy: 102,
  School: 100,
  Bank: 96,
  'Post Office': 94,
  'Bus Stop': 92,
  Transit: 92,
  Restaurant: 78,
  Hotel: 76,
  'Tourist Place': 74,
  Museum: 72,
  Temple: 70,
  Cinema: 68,
  Gym: 66,
  Salon: 64,
  Shop: 62,
  'Grocery Store': 62,
  Parking: 58,
  'Petrol Pump': 56,
  ATM: 54,
  Other: 50,
}

function num(v, fallback = null) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

/** Normalize Google LatLngBounds or plain object to { north, south, east, west }. */
export function boundsToPlain(bounds) {
  if (!bounds) return null
  if (typeof bounds.getNorthEast === 'function' && typeof bounds.getSouthWest === 'function') {
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    return {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    }
  }
  const north = num(bounds.north ?? bounds.northEast?.lat ?? bounds.maxLat)
  const south = num(bounds.south ?? bounds.southWest?.lat ?? bounds.minLat)
  const east = num(bounds.east ?? bounds.northEast?.lng ?? bounds.maxLng)
  const west = num(bounds.west ?? bounds.southWest?.lng ?? bounds.minLng)
  if (north == null || south == null || east == null || west == null) return null
  return { north, south, east, west }
}

export function resolveFeatureType(place = {}) {
  const types = place.types || place.google_types || place.googleTypes || []
  const first = Array.isArray(types) ? types[0] : place.type || place.google_type || place.googleType
  if (first && GOOGLE_TYPE_TO_FEATURE[String(first).toLowerCase()]) {
    return GOOGLE_TYPE_TO_FEATURE[String(first).toLowerCase()]
  }
  const cat = place.category || place.Category
  if (cat && CATEGORY_TO_FEATURE[cat]) return CATEGORY_TO_FEATURE[cat]
  return 'poi'
}

export function resolvePriority(place = {}, zoomLevel = 15) {
  const cat = place.category || 'Other'
  let p = CATEGORY_PRIORITY[cat] ?? CATEGORY_PRIORITY.Other
  const zl = num(place.zoomLevel ?? place.zoom_level, zoomLevel)
  if (zl != null) {
    p += Math.max(0, 16 - zl) * 1.2
  }
  const stored = place.mapRenderingConfig?.priority ?? place.map_rendering_config?.priority
  if (num(stored) != null) return num(stored)
  return Math.round(p)
}

/**
 * Build rendering config from Google Maps map + place (nearby/search/details).
 */
export function extractMapRenderingConfig({
  map = null,
  place = {},
  details = null,
  category = null,
} = {}) {
  const src = details || place
  const zoomLevel = num(
    map?.getZoom?.(),
    num(place.zoomLevel ?? place.zoom_level, 15)
  )
  const mapBounds = map?.getBounds?.() ? boundsToPlain(map.getBounds()) : null
  const geom = src?.geometry || place?.geometry
  const viewportRaw = geom?.viewport
  const viewport = viewportRaw
    ? boundsToPlain(viewportRaw)
    : mapBounds

  const primaryType =
    (Array.isArray(src?.types) && src.types[0]) ||
    place.type ||
    place.google_type ||
    'point_of_interest'

  const featureType = resolveFeatureType({
    ...place,
    types: src?.types || place.types,
    category: category || place.category,
    type: primaryType,
  })

  const priority = resolvePriority(
    { ...place, category: category || place.category, zoomLevel },
    zoomLevel
  )

  const lod = zoomLevel < 10 ? 0 : zoomLevel < 13 ? 1 : zoomLevel < 16 ? 2 : 3
  const tileLevel = Math.floor(clamp(zoomLevel, 0, 22))

  return {
    version: CONFIG_VERSION,
    zoomLevel,
    minZoom: num(map?.get?.('minZoom'), 3) ?? 3,
    maxZoom: num(map?.get?.('maxZoom'), 22) ?? 22,
    visibility: true,
    featureType,
    elementType: featureType === 'road' ? 'geometry' : 'labels',
    bounds: mapBounds,
    viewport,
    scale: 1,
    tileLevel,
    lod,
    clustering: {
      enabled: zoomLevel < 14,
      radius: 48,
      maxZoom: 14,
      minPoints: 2,
    },
    decluttering: {
      enabled: true,
      minZoom: 11,
      priorityThreshold: 0.45,
      maxLabels: zoomLevel < 12 ? 24 : zoomLevel < 13 ? 40 : zoomLevel < 14 ? 64 : 999,
    },
    priority,
    density: clamp(1 - (zoomLevel - 10) * 0.04, 0.4, 1),
    styleRules: buildStyleRulesForFeature(featureType),
    labelCollisionHandling: 'declutter',
    vectorTileLayers: [],
    simplification: zoomLevel < 12 ? 0.65 : zoomLevel < 15 ? 0.45 : 0.25,
    opacity: 1,
    iconSizeScaling: {
      baseZoom: zoomLevel,
      min: 0.65,
      max: 1.25,
      factor: 0.08,
    },
    textSizeScaling: {
      baseZoom: zoomLevel,
      min: 0.8,
      max: 1.2,
      factor: 0.06,
    },
    zIndex: 100 + priority,
    labelZoomStart: 11,
    labelZoomFull: 13.5,
    mapTypeId: map?.getMapTypeId?.() ?? null,
    extractedAt: new Date().toISOString(),
  }
}

function buildStyleRulesForFeature(featureType) {
  const base = [
    { featureType, elementType: 'labels', stylers: [{ visibility: 'on' }] },
    { featureType, elementType: 'geometry', stylers: [{ visibility: 'on' }] },
  ]
  if (featureType === 'transit') {
    base.push({ featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] })
  }
  if (featureType === 'landmark') {
    base.push({ featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] })
  }
  return base
}

/** Merge stored config with defaults for a place at current map zoom. */
export function resolvePlaceRendering(place, mapZoom) {
  const cfg = place?.mapRenderingConfig ?? place?.map_rendering_config ?? null
  const z = num(mapZoom, 12)
  const zl = num(cfg?.zoomLevel ?? place?.zoomLevel, 15)

  const textMinZoom = num(cfg?.decluttering?.minZoom, 11)

  const maxLabels = num(
    cfg?.decluttering?.maxLabels,
    z < 12 ? 24 : z < 13 ? 40 : z < 14 ? 64 : 999
  )

  const priority = num(cfg?.priority, resolvePriority(place, zl))

  const labelZoomStart = num(cfg?.labelZoomStart, 10)
  const labelZoomFull = num(cfg?.labelZoomFull, 12.5)

  const opacity = clamp(num(cfg?.opacity, 1), 0, 1)

  const iconScale = scaleForZoom(z, cfg?.iconSizeScaling)
  const textScale = scaleForZoom(z, cfg?.textSizeScaling)

  const visible =
    cfg?.visibility !== false &&
    (cfg?.minZoom == null || z >= num(cfg.minZoom, 0)) &&
    (cfg?.maxZoom == null || z <= num(cfg.maxZoom, 22))

  return {
    config: cfg,
    visible,
    textMinZoom,
    maxLabels,
    priority,
    labelZoomStart,
    labelZoomFull,
    opacity,
    iconScale,
    textScale,
    zIndex: num(cfg?.zIndex, 100 + priority),
    clustering: cfg?.clustering ?? { enabled: z < 14, radius: 48, maxZoom: 14 },
    labelCollisionHandling: cfg?.labelCollisionHandling || 'declutter',
    featureType: cfg?.featureType || resolveFeatureType(place),
    elementType: cfg?.elementType || 'labels',
  }
}

function scaleForZoom(zoom, scaling = {}) {
  const base = num(scaling.baseZoom, 15)
  const factor = num(scaling.factor, 0.08)
  const min = num(scaling.min, 0.7)
  const max = num(scaling.max, 1.25)
  const raw = 1 + (zoom - base) * factor
  return clamp(raw, min, max)
}

/** Attach mapRenderingConfig to a place draft/payload. */
export function withMapRenderingConfig(place, context = {}) {
  const config = extractMapRenderingConfig({
    map: context.map,
    place,
    details: context.details,
    category: context.category || place.category,
  })
  return {
    ...place,
    zoomLevel: place.zoomLevel ?? config.zoomLevel,
    mapRenderingConfig: config,
    map_rendering_config: config,
  }
}

/** Normalize API/DB payload field name. */
export function getPlaceRenderingConfig(place) {
  return place?.mapRenderingConfig ?? place?.map_rendering_config ?? null
}

function readMapCenter(map) {
  if (!map?.getCenter) return null
  const c = map.getCenter()
  if (!c) return null
  const lat = typeof c.lat === 'function' ? c.lat() : c.lat
  const lng = typeof c.lng === 'function' ? c.lng() : c.lng
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** Build export document for one or many places. */
export function buildPlacesExportDocument(places, { map = null, meta = {} } = {}) {
  const mapSnapshot = map
    ? {
        zoomLevel: map.getZoom?.(),
        center: readMapCenter(map),
        bounds: map.getBounds?.() ? boundsToPlain(map.getBounds()) : null,
        mapTypeId: map.getMapTypeId?.() ?? null,
      }
    : null

  return {
    exportedAt: new Date().toISOString(),
    format: 'umnaapp-places-v1',
    count: places.length,
    mapSnapshot,
    ...meta,
    places: places.map((p) => placeToExportRecord(p)),
  }
}

export function placeToExportRecord(place) {
  const ll = {
    lat: num(place.latitude ?? place.lat),
    lng: num(place.longitude ?? place.lng),
  }
  const cfg = getPlaceRenderingConfig(place) || extractMapRenderingConfig({ place })
  return {
    id: place.id ?? null,
    name: place.name || place.place_name_en,
    place_name_en: place.place_name_en ?? place.name,
    place_name_local: place.place_name_local ?? null,
    category: place.category ?? null,
    coordinates: ll,
    latitude: ll.lat,
    longitude: ll.lng,
    zoomLevel: place.zoomLevel ?? cfg.zoomLevel,
    place_id: place.place_id ?? place.google_place_id ?? place.googlePlaceId ?? null,
    type: place.type ?? place.google_type ?? null,
    types: place.types ?? place.google_types ?? null,
    address: place.address ?? place.full_address ?? place.fullAddress ?? null,
    vicinity: place.vicinity ?? null,
    village: place.village ?? null,
    taluk: place.taluk ?? null,
    district: place.district ?? null,
    state: place.state ?? null,
    country: place.country ?? null,
    metadata: {
      source: place.source ?? null,
      approvalStatus: place.approvalStatus ?? null,
      extracted_at: place.extracted_at ?? place.extractedAt ?? cfg.extractedAt,
    },
    mapRenderingConfig: cfg,
  }
}

/** GeoJSON FeatureCollection for bulk export. */
export function placesToGeoJSON(places) {
  return {
    type: 'FeatureCollection',
    features: places.map((place) => {
      const rec = placeToExportRecord(place)
      return {
        type: 'Feature',
        id: rec.id || rec.place_id || `${rec.name}-${rec.coordinates.lat}`,
        geometry: {
          type: 'Point',
          coordinates: [rec.coordinates.lng, rec.coordinates.lat],
        },
        properties: {
          ...rec,
          coordinates: undefined,
        },
      }
    }),
  }
}

export function buildPlacesExportBlob(places, { format = 'json', map = null, meta = {} } = {}) {
  const safeName =
    `places_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`

  if (format === 'geojson') {
    const geo = placesToGeoJSON(places)
    return {
      blob: new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' }),
      filename: `${safeName}.geojson`,
      ext: 'geojson',
    }
  }

  const doc = buildPlacesExportDocument(places, { map, meta })
  return {
    blob: new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
    filename: `${safeName}.json`,
    ext: 'json',
  }
}

/** Merge API-saved rows with extraction payload (keeps rendering config + DB ids). */
export function mergePlacesForExport(sent, saved = []) {
  if (!Array.isArray(saved) || saved.length === 0) return sent
  return sent.map((item) => {
    const pid = item.place_id || item.placeId || item.google_place_id
    const match = saved.find(
      (s) =>
        (pid && (s.google_place_id === pid || s.googlePlaceId === pid)) ||
        (Math.abs((s.latitude ?? 0) - (item.lat ?? item.latitude ?? 0)) < 0.00005 &&
          Math.abs((s.longitude ?? 0) - (item.lng ?? item.longitude ?? 0)) < 0.00005) ||
        String(s.name || s.place_name_en || '').toLowerCase() === String(item.name || '').toLowerCase()
    )
    if (!match) return item
    return {
      ...item,
      ...match,
      id: match.id ?? item.id,
      latitude: match.latitude ?? item.lat ?? item.latitude,
      longitude: match.longitude ?? item.lng ?? item.longitude,
      lat: match.latitude ?? item.lat,
      lng: match.longitude ?? item.lng,
      mapRenderingConfig:
        item.mapRenderingConfig ||
        item.map_rendering_config ||
        match.mapRenderingConfig ||
        match.map_rendering_config,
    }
  })
}

/**
 * Download export file. Works after async (e.g. Add to map) via Save File Picker or blob tab fallback.
 * @returns {{ ok: boolean, method?: string, filename?: string, manualUrl?: string, aborted?: boolean }}
 */
export async function downloadPlacesExport(
  places,
  { format = 'json', filename, map = null, meta = {} } = {}
) {
  if (!places?.length) {
    return { ok: false, reason: 'empty' }
  }

  const { blob, filename: autoName, ext } = buildPlacesExportBlob(places, { format, map, meta })
  const downloadName = filename
    ? filename.includes('.') ? filename : `${filename}.${ext}`
    : autoName

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: downloadName,
        types: [
          {
            description: format === 'geojson' ? 'GeoJSON' : 'JSON',
            accept: {
              [format === 'geojson' ? 'application/geo+json' : 'application/json']: [`.${ext}`],
            },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { ok: true, method: 'picker', filename: downloadName }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { ok: false, aborted: true }
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadName
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    if (a.parentNode) document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 5000)

  return { ok: true, method: 'anchor', filename: downloadName }
}

/** @deprecated sync alias — prefer await downloadPlacesExport */
export function downloadPlacesExportSync(places, options) {
  void downloadPlacesExport(places, options)
}
