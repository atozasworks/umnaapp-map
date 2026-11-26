/**
 * Read side of the OpenPlace catalogue (Overture, Foursquare OS Places, CSV
 * imports). Used by the Place Extractor in place of Google Places.
 *
 * Uses plain latitude/longitude columns (no PostGIS), so it runs on any
 * Postgres the app is deployed against.
 */
import axios from 'axios'
import prisma from '../config/database.js'
import { OPEN_PLACE_SOURCES } from '../utils/openPlaceCategory.js'
import { applyOpenPlaceSchema } from './openPlaceSetup.js'

/** Same tolerance as the place duplicate check (utils/placeDuplicate.js COORD_EPS). */
const COORD_EPS = 0.0001
/** Safety cap on rows read for one area before polygon clipping. */
const AREA_SCAN_LIMIT = 20000

let _tableReady = null
let _tableCheckedAt = 0

/** Whether the OpenPlace table exists; creates it when missing (cached; retried every minute on failure). */
export async function openPlacesAvailable() {
  const now = Date.now()
  if (_tableReady === true) return true
  if (_tableReady === false && now - _tableCheckedAt < 60_000) return false
  try {
    const probe = () => prisma.$queryRaw`SELECT to_regclass('public."OpenPlace"')::text AS t`
    let rows = await probe()
    if (!rows[0]?.t) {
      // Fresh deployment: create the catalogue table instead of waiting for a manual migration.
      await applyOpenPlaceSchema()
      console.log('[open-places] Created the OpenPlace catalogue table.')
      rows = await probe()
    }
    _tableReady = Boolean(rows[0]?.t)
  } catch (err) {
    console.error('[open-places] Catalogue table is not available:', err.message.split('\n')[0])
    _tableReady = false
  }
  _tableCheckedAt = now
  return _tableReady
}

export async function openPlaceStats() {
  if (!(await openPlacesAvailable())) return { available: false, total: 0, sources: [] }
  const rows = await prisma.$queryRaw`
    SELECT source, COUNT(*)::int AS count, MAX(release) AS release, MAX(imported_at) AS imported_at
    FROM "OpenPlace" GROUP BY source ORDER BY count DESC`
  const sources = rows.map((r) => ({
    source: r.source,
    label: OPEN_PLACE_SOURCES[r.source]?.label || r.source,
    license: OPEN_PLACE_SOURCES[r.source]?.license || null,
    count: r.count,
    release: r.release,
    importedAt: r.imported_at,
  }))
  return { available: true, total: sources.reduce((n, s) => n + s.count, 0), sources }
}

function serialize(row) {
  return {
    id: row.id,
    open_place_id: row.id,
    data_source: row.source,
    data_source_label: OPEN_PLACE_SOURCES[row.source]?.label || row.source,
    name: row.name,
    category: row.category,
    type: row.raw_category || null,
    lat: row.latitude,
    lng: row.longitude,
    address: row.full_address || [row.locality, row.region, row.postcode].filter(Boolean).join(', ') || null,
    locality: row.locality || null,
    region: row.region || null,
    pincode: row.postcode || null,
    phone: row.phone || null,
    website: row.website || null,
    confidence: row.confidence,
    ...(row.distance_meters != null ? { distance_meters: Math.round(row.distance_meters) } : {}),
  }
}

const COLUMNS = `o.id, o.source, o.name, o.category, o.raw_category, o.latitude, o.longitude,
  o.full_address, o.locality, o.region, o.postcode, o.phone, o.website, o.confidence`

/** True when the catalogue row sits on top of a place already in the app. */
const ON_MAP = `EXISTS (
  SELECT 1 FROM "Place" p
  WHERE p.latitude BETWEEN o.latitude - ${COORD_EPS} AND o.latitude + ${COORD_EPS}
    AND p.longitude BETWEEN o.longitude - ${COORD_EPS} AND o.longitude + ${COORD_EPS}
)`

/** Ray-casting point-in-polygon; ring = [[lng,lat],…] (closed or open). */
export function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

/**
 * Catalogue places inside a bounding box, optionally clipped to a polygon ring,
 * that are not on the map yet.
 * @param {{minLat:number,maxLat:number,minLng:number,maxLng:number}} bbox
 * @param {{ring?: number[][]|null, categories?: string[]|null, limit?: number}} options
 */
export async function extractOpenPlaces(bbox, { ring = null, categories = null, limit = 20 } = {}) {
  const empty = { places: [], total: 0, available: 0, alreadyOnMap: 0 }
  if (!(await openPlacesAvailable())) return empty

  const params = [bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng]
  const where = ['o.latitude BETWEEN $1 AND $2', 'o.longitude BETWEEN $3 AND $4']
  if (Array.isArray(categories) && categories.length > 0) {
    params.push(categories)
    where.push(`o.category = ANY($${params.length}::text[])`)
  }
  params.push(AREA_SCAN_LIMIT)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${COLUMNS}, ${ON_MAP} AS on_map
     FROM "OpenPlace" o
     WHERE ${where.join(' AND ')}
     ORDER BY (o.category = 'Other'), o.confidence DESC NULLS LAST, o.name
     LIMIT $${params.length}`,
    ...params
  )

  const inShape =
    Array.isArray(ring) && ring.length >= 4
      ? rows.filter((r) => pointInRing(r.longitude, r.latitude, ring))
      : rows
  const fresh = inShape.filter((r) => !r.on_map)
  return {
    places: fresh.slice(0, limit).map(serialize),
    total: inShape.length,
    available: fresh.length,
    alreadyOnMap: inShape.length - fresh.length,
  }
}

/** Name search across the catalogue; nearest first when a centre is given. */
export async function searchOpenPlaces(q, { lat = null, lng = null, limit = 8 } = {}) {
  if (!(await openPlacesAvailable())) return []
  const needle = String(q || '').trim().toLowerCase()
  if (needle.length < 2) return []
  const escaped = needle.replace(/[\\%_]/g, (c) => `\\${c}`)
  const hasCenter = Number.isFinite(lat) && Number.isFinite(lng)

  const params = [`${escaped}%`, `%${escaped}%`, limit]
  let distanceSelect = 'NULL::float AS distance_meters'
  let order = `(lower(o.name) LIKE $1) DESC, o.confidence DESC NULLS LAST, o.name`
  if (hasCenter) {
    params.push(lat, lng)
    // Equirectangular distance — accurate enough for ranking and display.
    distanceSelect = `111320 * sqrt(
        power(o.latitude - $4, 2) +
        power((o.longitude - $5) * cos(radians($4)), 2)
      ) AS distance_meters`
    order = `(lower(o.name) LIKE $1) DESC, distance_meters`
  }
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${COLUMNS}, ${distanceSelect}
     FROM "OpenPlace" o
     WHERE lower(o.name) LIKE $2
     ORDER BY ${order}
     LIMIT $3`,
    ...params
  )
  return rows.map(serialize)
}

// ---------------------------------------------------------------------------
// Region lookup ("Kadaba, Dakshina Kannada, Karnataka, India" → bounding box)
// ---------------------------------------------------------------------------

const NOMINATIM_SELF = (process.env.NOMINATIM_URL || '').trim().replace(/\/+$/, '')
const NOMINATIM_OSM = (process.env.OSM_NOMINATIM_URL || 'https://nominatim.openstreetmap.org')
  .trim()
  .replace(/\/+$/, '')
const OSM_ENABLED = String(process.env.OSM_NOMINATIM_ENABLED ?? 'true').toLowerCase() !== 'false'
const USER_AGENT =
  process.env.OSM_USER_AGENT || 'UMNAAPP-Map-Platform/1.0 (https://umnaapp.in; support@umnaapp.in)'

const regionCache = new Map()
const REGION_CACHE_TTL_MS = 6 * 60 * 60 * 1000

/** Geocode a region name to its bounding box. Returns null when nothing matches. */
export async function lookupRegion(query) {
  const q = String(query || '').trim()
  if (!q) return null
  const key = q.toLowerCase()
  const cached = regionCache.get(key)
  if (cached && Date.now() - cached.at < REGION_CACHE_TTL_MS) return cached.value

  const bases = [NOMINATIM_SELF, OSM_ENABLED ? NOMINATIM_OSM : ''].filter(Boolean)
  for (const base of bases) {
    try {
      const { data } = await axios.get(`${base}/search`, {
        params: { q, format: 'jsonv2', limit: 1, addressdetails: 0 },
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
        timeout: 10000,
      })
      const hit = Array.isArray(data) ? data[0] : null
      if (!hit) continue
      const lat = parseFloat(hit.lat)
      const lng = parseFloat(hit.lon)
      const bb = Array.isArray(hit.boundingbox) ? hit.boundingbox.map(parseFloat) : null
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const value = {
        name: hit.display_name || q,
        center: { lat, lng },
        bbox:
          bb && bb.length === 4 && bb.every(Number.isFinite)
            ? { minLat: bb[0], maxLat: bb[1], minLng: bb[2], maxLng: bb[3] }
            : { minLat: lat - 0.01, maxLat: lat + 0.01, minLng: lng - 0.01, maxLng: lng + 0.01 },
      }
      regionCache.set(key, { at: Date.now(), value })
      if (regionCache.size > 500) regionCache.delete(regionCache.keys().next().value)
      return value
    } catch (err) {
      console.warn(`[open-places] region lookup via ${base} failed:`, err.message)
    }
  }
  return null
}
