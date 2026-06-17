/**
 * Merge places from the local application DB, umnaappdb OSM tables, and HTTP geocoders
 * into one deduplicated list. Local persisted places always win on conflicts.
 */

import prisma from '../config/database.js'
import { placePublicVisibilityOr } from './placeApproval.js'
import { searchExternalProviders, normalizeSearchRowAddress } from './externalPlaceSearch.js'
import {
  searchOsmByName,
  searchOsmInBbox,
  findOsmNearby,
  findOsmAtPoint,
  findOsmInPolygon,
  getOsmPlaceById,
  countOsmCategoriesInBbox,
  isOsmQueryEnabled,
} from './osmPlaceQuery.js'
import { normalizePlaceName, COORD_EPS } from '../utils/placeDuplicate.js'
import {
  PLACE_SOURCES,
  isPersistedSource,
  makeOsmPlaceId,
  externalSourceId,
  isOsmPlaceId,
} from '../utils/placeSource.js'
import { pickFromReverseGeocode, lookupOsmPlaceById } from './placePickService.js'

const PRIORITY = {
  db: 100,
  osm: 50,
  external: 30,
}

function coordKey(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `${lat.toFixed(5)}-${lng.toFixed(5)}`
}

function nameCoordKey(name, lat, lng) {
  const nameKey = normalizePlaceName(name)
  if (!nameKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `name:${nameKey}|${lat.toFixed(4)}-${lng.toFixed(4)}`
}

function dedupeKeys(place) {
  const keys = []
  const id = place.id ?? place.placeId
  if (id) keys.push(`id:${id}`)
  if (place.sourceId) keys.push(`src:${place.sourceId}`)
  if (place.googlePlaceId) keys.push(`gpid:${place.googlePlaceId}`)
  if (place.osmId != null) keys.push(`osm:${place.osmType || 'node'}-${place.osmId}`)

  const lat = parseFloat(place.latitude ?? place.lat)
  const lng = parseFloat(place.longitude ?? place.lng ?? place.lon)
  const ck = coordKey(lat, lng)
  if (ck) keys.push(`coord:${ck}`)
  const nk = nameCoordKey(place.name ?? place.placeNameEn ?? place.displayName, lat, lng)
  if (nk) keys.push(nk)
  return keys
}

/**
 * Merge place layers by priority; higher-priority source wins on duplicate keys.
 * @param {Array<{ places: object[], priority: number }>} layers
 */
export function dedupePlaces(layers) {
  const seen = new Set()
  const out = []
  const sorted = [...layers].sort((a, b) => b.priority - a.priority)

  for (const { places } of sorted) {
    for (const place of places || []) {
      const keys = dedupeKeys(place)
      if (keys.some((k) => seen.has(k))) continue
      for (const k of keys) seen.add(k)
      out.push(place)
    }
  }
  return out
}

function dbRowToSearchResult(p) {
  return {
    placeId: p.id,
    id: p.id,
    displayName: p.placeNameEn ?? p.name,
    name: p.placeNameEn ?? p.name,
    lat: p.latitude,
    lng: p.longitude,
    latitude: p.latitude,
    longitude: p.longitude,
    address: p.category ? { county: p.category } : null,
    category: p.category,
    source: p.source || PLACE_SOURCES.CONTRIBUTION,
    isDbPlace: true,
    isPersisted: true,
  }
}

function osmRowToSearchResult(p) {
  return {
    placeId: p.id,
    id: p.id,
    displayName: p.name,
    name: p.name,
    lat: p.latitude,
    lng: p.longitude,
    latitude: p.latitude,
    longitude: p.longitude,
    address: p.category ? { county: p.category } : null,
    category: p.category,
    source: PLACE_SOURCES.OSM,
    sourceId: p.sourceId,
    isDbPlace: false,
    isPersisted: false,
  }
}

function externalRowToSearchResult(r, i) {
  const n = normalizeSearchRowAddress(r)
  const lat = parseFloat(n.lat)
  const lng = parseFloat(n.lon ?? n.lng)
  const sourceId = externalSourceId(n)
  return {
    placeId: n.place_id ?? n.id ?? sourceId ?? `api-${lat}-${lng}-${i}`,
    id: sourceId ?? `api-${lat}-${lng}-${i}`,
    displayName: n.display_name ?? n.name ?? n.formatted ?? '',
    name: n.display_name ?? n.name ?? n.formatted ?? '',
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    address: n.address ?? null,
    source: PLACE_SOURCES.EXTERNAL,
    sourceId,
    provider: n._provider || null,
    isDbPlace: false,
    isPersisted: false,
  }
}

/** Search local Place table by text. */
export async function searchLocalPlaces(q, { viewerId, limit = 15 } = {}) {
  if (!prisma.place || String(q || '').trim().length < 2) return []
  const term = String(q).trim()
  const rows = await prisma.place.findMany({
    where: {
      AND: [
        placePublicVisibilityOr(viewerId),
        {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { placeNameEn: { contains: term, mode: 'insensitive' } },
            { placeNameLocal: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
          ],
        },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      placeNameEn: true,
      placeNameLocal: true,
      category: true,
      latitude: true,
      longitude: true,
      source: true,
    },
  })
  return rows.map(dbRowToSearchResult)
}

/**
 * Unified text search: local DB + OSM DB + HTTP geocoders in parallel.
 */
export async function unifiedTextSearch(q, { viewerId, limit = 10, lat, lng, radiusKm } = {}) {
  const term = String(q || '').trim()
  if (term.length < 2) return { results: [], providers: [] }

  const [dbPlaces, osmPlaces, external] = await Promise.all([
    searchLocalPlaces(term, { viewerId, limit }),
    isOsmQueryEnabled()
      ? searchOsmByName(term, { limit, lat, lng, radiusKm })
      : Promise.resolve([]),
    searchExternalProviders(term, { limit, lat, lng, radiusKm }),
  ])

  const externalRows = (external.rows || []).map(externalRowToSearchResult)
  const merged = dedupePlaces([
    { places: dbPlaces, priority: PRIORITY.db },
    { places: osmPlaces.map(osmRowToSearchResult), priority: PRIORITY.osm },
    { places: externalRows, priority: PRIORITY.external },
  ])

  const providers = []
  if (dbPlaces.length) providers.push('local-db')
  if (osmPlaces.length) providers.push('umnaappdb-osm')
  if (external.providers?.length) providers.push(...external.providers)

  return {
    results: merged.slice(0, Math.max(limit, merged.length)),
    providers,
    counts: {
      db: dbPlaces.length,
      osm: osmPlaces.length,
      external: externalRows.length,
      merged: merged.length,
    },
    upstreamError: external.error || null,
  }
}

/** Map list: local DB rows + optional OSM bbox overlay, deduplicated. */
export async function unifiedMapPlaces({
  viewerId,
  categories = [],
  minLat,
  maxLat,
  minLng,
  maxLng,
  limit = 5000,
  offset = 0,
  includeOsm = true,
} = {}) {
  const categoryFilter =
    categories.length > 0 ? { category: { in: categories } } : {}

  const bboxFilter = {}
  if (minLat != null && maxLat != null) bboxFilter.latitude = { gte: minLat, lte: maxLat }
  if (minLng != null && maxLng != null) bboxFilter.longitude = { gte: minLng, lte: maxLng }

  const dbPlaces = await prisma.place.findMany({
    where: {
      AND: [placePublicVisibilityOr(viewerId), categoryFilter, bboxFilter],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      name: true,
      placeNameEn: true,
      placeNameLocal: true,
      category: true,
      latitude: true,
      longitude: true,
      zoomLevel: true,
      mapRenderingConfig: true,
      source: true,
      userId: true,
      userName: true,
      userEmail: true,
      createdAt: true,
      approvalStatus: true,
      approvedAt: true,
      autoApproveAt: true,
      festivalStartDate: true,
      festivalEndDate: true,
      festivalRecurrence: true,
    },
  })

  const dbNormalized = dbPlaces.map((p) => ({
    ...p,
    isPersisted: true,
    isDbPlace: true,
  }))

  let osmOverlay = []
  const hasBbox =
    minLat != null && maxLat != null && minLng != null && maxLng != null
  if (includeOsm && isOsmQueryEnabled() && hasBbox) {
    osmOverlay = await searchOsmInBbox({
      minLat,
      maxLat,
      minLng,
      maxLng,
      limit: Math.min(500, parseInt(process.env.OSM_PLACES_BBOX_LIMIT, 10) || 500),
      categories,
    })
  }

  const merged = dedupePlaces([
    { places: dbNormalized, priority: PRIORITY.db },
    { places: osmOverlay, priority: PRIORITY.osm },
  ])

  const categoryCounts = await prisma.place.groupBy({
    by: ['category'],
    where: placePublicVisibilityOr(viewerId),
    _count: { category: true },
    orderBy: { category: 'asc' },
  })

  let availableCategories = categoryCounts.map((item) => ({
    category: item.category,
    count: item._count.category,
  }))

  if (hasBbox && includeOsm && isOsmQueryEnabled()) {
    const osmCats = await countOsmCategoriesInBbox({ minLat, maxLat, minLng, maxLng })
    const catMap = new Map(availableCategories.map((c) => [c.category, c.count]))
    for (const { category, count } of osmCats) {
      catMap.set(category, (catMap.get(category) || 0) + count)
    }
    availableCategories = [...catMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category))
  }

  return {
    places: merged,
    availableCategories,
    counts: { db: dbNormalized.length, osm: osmOverlay.length, merged: merged.length },
  }
}

/** Nearby from local DB (PostGIS/Prisma) + OSM DB. */
export async function unifiedNearby({
  lat,
  lng,
  radiusMeters = 2000,
  excludeId = null,
  viewerId = null,
  limit = 8,
  findNearbyPostgis,
  placePublicVisibilityOrFn,
} = {}) {
  let dbNearby = []
  if (findNearbyPostgis) {
    const spatial = await findNearbyPostgis({
      lat,
      lng,
      radiusMeters,
      excludeId: isOsmPlaceId(excludeId) ? null : excludeId,
      limit,
      viewerId,
    })
    if (spatial) {
      dbNearby = spatial.map((p) => ({
        ...p,
        isPersisted: true,
        isDbPlace: true,
      }))
    }
  }

  if (!dbNearby.length && prisma.place && placePublicVisibilityOrFn) {
    const delta = radiusMeters / 111000 + COORD_EPS
    const rows = await prisma.place.findMany({
      where: {
        AND: [
          placePublicVisibilityOrFn(viewerId),
          {
            ...(excludeId && !isOsmPlaceId(excludeId) ? { id: { not: excludeId } } : {}),
            latitude: { gte: lat - delta, lte: lat + delta },
            longitude: { gte: lng - delta, lte: lng + delta },
          },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        placeNameEn: true,
        category: true,
        latitude: true,
        longitude: true,
        userId: true,
        userName: true,
      },
    })
    dbNearby = rows.map((p) => ({ ...p, isPersisted: true, isDbPlace: true }))
  }

  const osmNearby = isOsmQueryEnabled()
    ? await findOsmNearby({ lat, lng, radiusMeters, excludeId, limit })
    : []

  return dedupePlaces([
    { places: dbNearby, priority: PRIORITY.db },
    { places: osmNearby, priority: PRIORITY.osm },
  ]).slice(0, limit)
}

/** Polygon explore: local DB + OSM. */
export async function unifiedInPolygon({ ring, viewerId, category, findInPolygonPostgis } = {}) {
  let dbInside = await findInPolygonPostgis?.({ ring, viewerId, limit: 2500 })
  if (!dbInside && prisma.place) {
    dbInside = []
  } else if (dbInside) {
    dbInside = dbInside.map((p) => ({ ...p, isPersisted: true, isDbPlace: true }))
  }

  const osmInside = isOsmQueryEnabled()
    ? await findOsmInPolygon({ ring, limit: 500, category })
    : []

  return dedupePlaces([
    { places: dbInside || [], priority: PRIORITY.db },
    { places: osmInside, priority: PRIORITY.osm },
  ])
}

/** Pick the best place at a map click — local DB wins, then OSM polygon/POI. */
export async function unifiedPickAtPoint({
  lat,
  lng,
  radiusMeters = 2500,
  viewerId = null,
  findNearbyPostgis,
  placePublicVisibilityOrFn,
} = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const nearby = await unifiedNearby({
    lat,
    lng,
    radiusMeters: Math.min(radiusMeters, 800),
    limit: 3,
    viewerId,
    findNearbyPostgis,
    placePublicVisibilityOrFn,
  })
  const dbHit = nearby.find((p) => p.isDbPlace || p.isPersisted)
  if (dbHit) {
    const dLat = (dbHit.latitude - lat) * 111000
    const dLng = (dbHit.longitude - lng) * 111000 * Math.cos((lat * Math.PI) / 180)
    const dist = Math.sqrt(dLat * dLat + dLng * dLng)
    if (dist <= Math.min(radiusMeters, 600)) return dbHit
  }

  if (isOsmQueryEnabled()) {
    const osmHit = await findOsmAtPoint({ lat, lng, radiusMeters })
    if (osmHit) return osmHit
  }

  return pickFromReverseGeocode(lat, lng)
}

/** Resolve place details from local DB or OSM DB. */
export async function unifiedPlaceById(id, { viewerId, isPlaceVisibleToUser } = {}) {
  if (isOsmPlaceId(id)) {
    const fromDb = await getOsmPlaceById(id)
    if (fromDb) return fromDb
    return lookupOsmPlaceById(id)
  }

  if (!prisma.place) return null
  const place = await prisma.place.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      placeNameEn: true,
      placeNameLocal: true,
      category: true,
      latitude: true,
      longitude: true,
      zoomLevel: true,
      source: true,
      userId: true,
      approvalStatus: true,
      fullAddress: true,
      village: true,
      taluk: true,
      district: true,
      state: true,
      country: true,
      pincode: true,
      phone: true,
      website: true,
      description: true,
      rating: true,
      reviewCount: true,
      openingHours: true,
      businessStatus: true,
      googlePhotos: true,
      googleType: true,
      googleTypes: true,
      mapRenderingConfig: true,
      festivalStartDate: true,
      festivalEndDate: true,
      festivalRecurrence: true,
      approvedAt: true,
      autoApproveAt: true,
      createdAt: true,
    },
  })
  if (!place) return null
  if (isPlaceVisibleToUser && !isPlaceVisibleToUser(place, viewerId)) return null
  return { ...place, isPersisted: isPersistedSource(place.source), isDbPlace: true }
}

/** Map external HTTP rows to Ask Maps place shape. */
export function mapExternalToAskPlace(row, intent, origin, haversineMeters) {
  const lat = parseFloat(row.lat)
  const lng = parseFloat(row.lon ?? row.lng)
  const displayName = row.display_name ?? row.displayName ?? row.name ?? 'Place'
  const distanceMeters =
    origin != null && haversineMeters
      ? haversineMeters(origin.lat, origin.lng, lat, lng)
      : null
  const addr = row.address || {}
  const sourceId = externalSourceId(row)
  return {
    id: sourceId ?? String(row.place_id ?? row.osm_id ?? `ext-${lat.toFixed(5)}-${lng.toFixed(5)}`),
    name: displayName,
    place_name_en: displayName,
    place_name_local: null,
    category: row.category || 'Other',
    latitude: lat,
    longitude: lng,
    rating: null,
    reviewCount: null,
    distanceMeters: distanceMeters != null ? Math.round(distanceMeters) : null,
    village: addr.village || addr.suburb || addr.town || null,
    district: addr.state_district || addr.county || addr.city || null,
    state: addr.state || null,
    source: PLACE_SOURCES.EXTERNAL,
    isPersisted: false,
  }
}

/** Map OSM DB row to Ask Maps place shape. */
export function mapOsmToAskPlace(row, origin, haversineMeters) {
  const distanceMeters =
    origin != null && haversineMeters
      ? haversineMeters(origin.lat, origin.lng, row.latitude, row.longitude)
      : row.distanceMeters ?? null
  return {
    id: row.id,
    name: row.name,
    place_name_en: row.name,
    place_name_local: null,
    category: row.category,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: null,
    reviewCount: null,
    distanceMeters: distanceMeters != null ? Math.round(distanceMeters) : null,
    source: PLACE_SOURCES.OSM,
    isPersisted: false,
  }
}

export { isOsmQueryEnabled, makeOsmPlaceId, isOsmPlaceId }
