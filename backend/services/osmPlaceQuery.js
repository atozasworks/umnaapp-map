/**
 * Direct read-only queries against umnaappdb planet_osm_* tables (osm2pgsql).
 */

import { getOsmPool, osmDatabaseAvailable, osmDatabaseConfigured } from '../config/osmDatabase.js'
import { mapGoogleTypeToCategory } from '../utils/googlePlaceCategory.js'
import { makeOsmPlaceId, PLACE_SOURCES } from '../utils/placeSource.js'
import { enrichOsmPlaceFromTags } from '../utils/osmPlaceTags.js'

const OSM_TAG_COLUMNS = [
  'amenity',
  'shop',
  'tourism',
  'leisure',
  'office',
  'craft',
  'historic',
  'man_made',
  'building',
  'natural',
  'landuse',
  'highway',
  'railway',
  'place',
  'emergency',
  'healthcare',
  'sport',
]

const POI_FILTER = OSM_TAG_COLUMNS.map((c) => `"${c}" IS NOT NULL`).join(' OR ')

const BBOX_LIMIT = parseInt(process.env.OSM_PLACES_BBOX_LIMIT, 10) || 500
const SEARCH_LIMIT = parseInt(process.env.OSM_PLACES_SEARCH_LIMIT, 10) || 20
const NEARBY_LIMIT = parseInt(process.env.OSM_PLACES_NEARBY_LIMIT, 10) || 20

const _cache = new Map()
const CACHE_TTL_MS = parseInt(process.env.OSM_PLACES_CACHE_TTL_MS, 10) || 120000
const CACHE_MAX = parseInt(process.env.OSM_PLACES_CACHE_MAX, 10) || 200

function cacheGet(key) {
  const hit = _cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    _cache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key, value) {
  if (_cache.size >= CACHE_MAX) {
    const first = _cache.keys().next().value
    if (first) _cache.delete(first)
  }
  _cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
}

function primaryOsmTag(row) {
  for (const col of OSM_TAG_COLUMNS) {
    const val = row[col]
    if (val != null && String(val).trim()) return { key: col, value: String(val).trim() }
  }
  return null
}

function resolveOsmCategory(row) {
  const tag = primaryOsmTag(row)
  if (!tag) return 'Other'
  if (tag.key === 'place') {
    const label = String(tag.value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
    if (label && label.toLowerCase() !== 'yes') return label
  }
  if (tag.key === 'building' && tag.value === 'yes') {
    return mapGoogleTypeToCategory('establishment')
  }
  return mapGoogleTypeToCategory(tag.value)
}

function rowToUnifiedPlace(row, { osmType = 'node' } = {}) {
  const lat = parseFloat(row.latitude)
  const lng = parseFloat(row.longitude)
  const name = String(row.name || '').trim()
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const tag = primaryOsmTag(row)
  const category = resolveOsmCategory(row)
  const id = makeOsmPlaceId(osmType, row.osm_id)

  return {
    id,
    placeId: id,
    name,
    placeNameEn: name,
    place_name_en: name,
    placeNameLocal: null,
    place_name_local: null,
    category,
    latitude: lat,
    longitude: lng,
    zoomLevel: 16,
    source: PLACE_SOURCES.OSM,
    sourceId: id,
    osmId: row.osm_id,
    osmType,
    osmTag: tag?.value ?? null,
    isPersisted: false,
    isDbPlace: false,
    userId: null,
    userName: null,
    approvalStatus: null,
  }
}

const POINT_SELECT = `
  osm_id, name,
  ${OSM_TAG_COLUMNS.map((c) => `"${c}"`).join(', ')},
  ST_Y(way) AS latitude,
  ST_X(way) AS longitude
`

const POLYGON_SELECT = `
  osm_id, name,
  ${OSM_TAG_COLUMNS.map((c) => `"${c}"`).join(', ')},
  ST_Y(ST_PointOnSurface(way)) AS latitude,
  ST_X(ST_PointOnSurface(way)) AS longitude
`

async function queryPoints(sql, params) {
  if (!(await osmDatabaseAvailable())) return []
  const pool = await getOsmPool()
  if (!pool) return []
  try {
    const { rows } = await pool.query(sql, params)
    return rows.map((r) => rowToUnifiedPlace(r, { osmType: 'node' })).filter(Boolean)
  } catch (e) {
    console.warn('[osm-query] point query failed:', e.message)
    return []
  }
}

async function queryPolygons(sql, params) {
  if (!(await osmDatabaseAvailable())) return []
  const pool = await getOsmPool()
  if (!pool) return []
  try {
    const { rows } = await pool.query(sql, params)
    return rows.map((r) => rowToUnifiedPlace(r, { osmType: 'way' })).filter(Boolean)
  } catch (e) {
    console.warn('[osm-query] polygon query failed:', e.message)
    return []
  }
}

/**
 * Named POIs inside a bounding box (for map rendering).
 */
export async function searchOsmInBbox({ minLat, maxLat, minLng, maxLng, limit = BBOX_LIMIT, categories = [] } = {}) {
  if (!Number.isFinite(minLat) || !Number.isFinite(maxLat) || !Number.isFinite(minLng) || !Number.isFinite(maxLng)) {
    return []
  }

  const cacheKey = `bbox:${minLat.toFixed(4)}:${maxLat.toFixed(4)}:${minLng.toFixed(4)}:${maxLng.toFixed(4)}:${limit}:${categories.join(',')}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const cap = Math.min(Math.max(1, limit), 2000)
  const envelope = `ST_MakeEnvelope($1, $2, $3, $4, 4326)`

  const pointSql = `
    SELECT ${POINT_SELECT}
      FROM planet_osm_point
     WHERE name IS NOT NULL AND btrim(name) <> ''
       AND way && ${envelope}
       AND (${POI_FILTER})
     ORDER BY name
     LIMIT $5
  `
  const polySql = `
    SELECT ${POLYGON_SELECT}
      FROM planet_osm_polygon
     WHERE name IS NOT NULL AND btrim(name) <> ''
       AND way && ${envelope}
       AND (${POI_FILTER})
     ORDER BY name
     LIMIT $5
  `

  const [points, polygons] = await Promise.all([
    queryPoints(pointSql, [minLng, minLat, maxLng, maxLat, cap]),
    queryPolygons(polySql, [minLng, minLat, maxLng, maxLat, Math.max(1, Math.floor(cap / 4))]),
  ])

  let merged = [...points, ...polygons]
  if (categories.length > 0) {
    const catSet = new Set(categories.map((c) => String(c).toLowerCase()))
    merged = merged.filter((p) => catSet.has(String(p.category || '').toLowerCase()))
  }

  cacheSet(cacheKey, merged)
  return merged
}

/**
 * Text search against OSM named features.
 */
export async function searchOsmByName(q, { limit = SEARCH_LIMIT, lat, lng, radiusKm } = {}) {
  const term = String(q || '').trim()
  if (term.length < 2) return []

  const cacheKey = `name:${term.toLowerCase()}:${limit}:${lat}:${lng}:${radiusKm}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const cap = Math.min(Math.max(1, limit), 50)
  const pattern = `%${term.replace(/[%_\\]/g, '\\$&')}%`
  const params = [pattern, cap]
  let spatialFilter = ''

  if (Number.isFinite(lat) && Number.isFinite(lng) && radiusKm != null) {
    const radiusM = Math.max(100, radiusKm * 1000)
    spatialFilter = `AND ST_DWithin(way::geography, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)`
    params.push(lng, lat, radiusM)
  }

  const pointSql = `
    SELECT ${POINT_SELECT}
      FROM planet_osm_point
     WHERE name ILIKE $1
       AND btrim(name) <> ''
       AND (${POI_FILTER})
       ${spatialFilter}
     ORDER BY name
     LIMIT $2
  `
  const polySql = `
    SELECT ${POLYGON_SELECT}
      FROM planet_osm_polygon
     WHERE name ILIKE $1
       AND btrim(name) <> ''
       AND (${POI_FILTER})
       ${spatialFilter}
     ORDER BY name
     LIMIT $2
  `

  const [points, polygons] = await Promise.all([
    queryPoints(pointSql, params),
    queryPolygons(polySql, params),
  ])

  const merged = [...points, ...polygons]
  cacheSet(cacheKey, merged)
  return merged
}

/**
 * Best matching named OSM feature at a map click (village inside polygon, then nearest POI).
 */
export async function findOsmAtPoint({ lat, lng, radiusMeters = 2500 } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (!(await osmDatabaseAvailable())) return null

  const pool = await getOsmPool()
  if (!pool) return null

  const point = `ST_SetSRID(ST_MakePoint($1, $2), 4326)`
  const cap = 8

  try {
    const polyContainsSql = `
      SELECT ${POLYGON_SELECT},
             0::float AS "distanceMeters",
             0 AS "pickRank"
        FROM planet_osm_polygon
       WHERE name IS NOT NULL AND btrim(name) <> ''
         AND (${POI_FILTER})
         AND ST_Contains(way, ${point})
       ORDER BY ST_Area(way) ASC
       LIMIT 1
    `
    const { rows: insideRows } = await pool.query(polyContainsSql, [lng, lat])
    if (insideRows.length) {
      const place = rowToUnifiedPlace(insideRows[0], { osmType: 'way' })
      if (place) return { ...place, distanceMeters: 0, pickRank: 0 }
    }

    const pointSql = `
      SELECT ${POINT_SELECT},
             ST_Distance(way::geography, ${point}::geography) AS "distanceMeters",
             1 AS "pickRank"
        FROM planet_osm_point
       WHERE name IS NOT NULL AND btrim(name) <> ''
         AND (${POI_FILTER})
         AND ST_DWithin(way::geography, ${point}::geography, $3)
       ORDER BY way <-> ${point}
       LIMIT $4
    `
    const polyNearSql = `
      SELECT ${POLYGON_SELECT},
             ST_Distance(ST_PointOnSurface(way)::geography, ${point}::geography) AS "distanceMeters",
             2 AS "pickRank"
        FROM planet_osm_polygon
       WHERE name IS NOT NULL AND btrim(name) <> ''
         AND (${POI_FILTER})
         AND ST_DWithin(ST_PointOnSurface(way)::geography, ${point}::geography, $3)
       ORDER BY ST_PointOnSurface(way)::geography <-> ${point}::geography
       LIMIT $4
    `

    const [{ rows: pointRows }, { rows: polyRows }] = await Promise.all([
      pool.query(pointSql, [lng, lat, radiusMeters, cap]),
      pool.query(polyNearSql, [lng, lat, radiusMeters, cap]),
    ])

    const candidates = []
    for (const r of pointRows) {
      const place = rowToUnifiedPlace(r, { osmType: 'node' })
      if (!place) continue
      candidates.push({
        ...place,
        distanceMeters: Math.round(parseFloat(r.distanceMeters) || 0),
        pickRank: 1,
      })
    }
    for (const r of polyRows) {
      const place = rowToUnifiedPlace(r, { osmType: 'way' })
      if (!place) continue
      candidates.push({
        ...place,
        distanceMeters: Math.round(parseFloat(r.distanceMeters) || 0),
        pickRank: 2,
      })
    }

    if (!candidates.length) return null
    candidates.sort((a, b) => {
      if (a.pickRank !== b.pickRank) return a.pickRank - b.pickRank
      return (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999)
    })
    return candidates[0]
  } catch (e) {
    console.warn('[osm-query] pick at point failed:', e.message)
    return null
  }
}

/**
 * Nearest named OSM POIs within radiusMeters.
 */
export async function findOsmNearby({ lat, lng, radiusMeters = 2000, limit = NEARBY_LIMIT, excludeId = null } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

  const cap = Math.min(Math.max(1, limit), 50)
  const parsed = excludeId ? String(excludeId).match(/^osm-(node|way|relation)-(-?\d+)$/) : null
  const excludeOsmId = parsed ? parseInt(parsed[2], 10) : null

  const pointSql = `
    SELECT ${POINT_SELECT},
           ST_Distance(way::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS "distanceMeters"
      FROM planet_osm_point
     WHERE name IS NOT NULL AND btrim(name) <> ''
       AND (${POI_FILTER})
       AND ($4::bigint IS NULL OR osm_id <> $4)
       AND ST_DWithin(way::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
     ORDER BY way <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
     LIMIT $5
  `

  if (!(await osmDatabaseAvailable())) return []
  const pool = await getOsmPool()
  if (!pool) return []
  try {
    const { rows } = await pool.query(pointSql, [lng, lat, radiusMeters, excludeOsmId, cap])
    return rows
      .map((r) => {
        const place = rowToUnifiedPlace(r, { osmType: 'node' })
        if (!place) return null
        return {
          ...place,
          distanceMeters: Math.round(parseFloat(r.distanceMeters) || 0),
        }
      })
      .filter(Boolean)
  } catch (e) {
    console.warn('[osm-query] nearby failed:', e.message)
    return []
  }
}

/**
 * Places inside a GeoJSON polygon ring.
 */
export async function findOsmInPolygon({ ring, limit = 500, category = null } = {}) {
  if (!Array.isArray(ring) || ring.length < 4) return []
  if (!(await osmDatabaseAvailable())) return []

  const pool = await getOsmPool()
  if (!pool) return []

  const wkt = `POLYGON((${ring.map(([x, y]) => `${Number(x)} ${Number(y)}`).join(', ')}))`
  const cap = Math.min(Math.max(1, limit), 2000)

  try {
    const pointSql = `
      SELECT ${POINT_SELECT}
        FROM planet_osm_point
       WHERE name IS NOT NULL AND btrim(name) <> ''
         AND (${POI_FILTER})
         AND ST_Contains(ST_SetSRID(ST_GeomFromText($1), 4326), way)
       ORDER BY name
       LIMIT $2
    `
    const polySql = `
      SELECT ${POLYGON_SELECT}
        FROM planet_osm_polygon
       WHERE name IS NOT NULL AND btrim(name) <> ''
         AND (${POI_FILTER})
         AND ST_Contains(ST_SetSRID(ST_GeomFromText($1), 4326), ST_PointOnSurface(way))
       ORDER BY name
       LIMIT $2
    `
    const [points, polygons] = await Promise.all([
      queryPoints(pointSql, [wkt, cap]),
      queryPolygons(polySql, [wkt, Math.max(1, Math.floor(cap / 4))]),
    ])
    let merged = [...points, ...polygons]
    if (category) {
      merged = merged.filter((p) => String(p.category).toLowerCase() === String(category).toLowerCase())
    }
    return merged
  } catch (e) {
    console.warn('[osm-query] polygon query failed:', e.message)
    return []
  }
}

/** Fetch a single OSM feature by unified id (osm-node-123, etc.). */
export async function getOsmPlaceById(id) {
  const parsed = String(id || '').match(/^osm-(node|way|relation)-(-?\d+)$/)
  if (!parsed) return null
  if (!(await osmDatabaseAvailable())) return null

  const osmType = parsed[1]
  const osmId = parseInt(parsed[2], 10)
  const pool = await getOsmPool()
  if (!pool) return null

  const table = osmType === 'node' ? 'planet_osm_point' : 'planet_osm_polygon'
  const select = osmType === 'node' ? POINT_SELECT : POLYGON_SELECT
  const resolvedType = osmType === 'node' ? 'node' : 'way'

  try {
    let rows
    try {
      ;({ rows } = await pool.query(
        `SELECT ${select}, tags FROM ${table} WHERE osm_id = $1 LIMIT 1`,
        [osmId]
      ))
    } catch {
      ;({ rows } = await pool.query(
        `SELECT ${select} FROM ${table} WHERE osm_id = $1 LIMIT 1`,
        [osmId]
      ))
    }
    if (!rows.length) return null
    const base = rowToUnifiedPlace(rows[0], { osmType: resolvedType })
    if (!base) return null
    return enrichOsmPlaceFromTags(base, rows[0].tags)
  } catch (e) {
    console.warn('[osm-query] getById failed:', e.message)
    return null
  }
}

/** Category counts from OSM POIs in a bbox (for unified category chips). */
export async function countOsmCategoriesInBbox({ minLat, maxLat, minLng, maxLng } = {}) {
  if (!(await osmDatabaseAvailable())) return []
  const pool = await getOsmPool()
  if (!pool) return []

  try {
    const { rows } = await pool.query(
      `
      SELECT category, count(*)::int AS count FROM (
        SELECT COALESCE(NULLIF(btrim(amenity), ''), NULLIF(btrim(shop), ''), NULLIF(btrim(tourism), ''), 'other') AS raw_tag
          FROM planet_osm_point
         WHERE name IS NOT NULL AND btrim(name) <> ''
           AND way && ST_MakeEnvelope($1, $2, $3, $4, 4326)
           AND (${POI_FILTER})
         LIMIT 5000
      ) t
      GROUP BY raw_tag
      ORDER BY count DESC
      LIMIT 40
      `,
      [minLng, minLat, maxLng, maxLat]
    )
    const counts = new Map()
    for (const row of rows) {
      const cat = mapGoogleTypeToCategory(row.raw_tag)
      counts.set(cat, (counts.get(cat) || 0) + row.count)
    }
    return [...counts.entries()].map(([category, count]) => ({ category, count }))
  } catch {
    return []
  }
}

export function isOsmQueryEnabled() {
  return osmDatabaseConfigured()
}
