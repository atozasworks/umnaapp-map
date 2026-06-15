/**
 * PostGIS-backed spatial queries for places, with graceful fallback.
 *
 * When the `geom` column + PostGIS extension are present these use the GiST
 * index via ST_DWithin (radius / nearest) and ST_Contains (polygon), replacing
 * bounding-box + in-memory JavaScript filtering. If PostGIS isn't available
 * (extension not installed, migration not applied, or an older DB) every
 * function returns `null` so callers transparently fall back to the previous
 * Prisma/JS implementation.
 */

import prisma from '../config/database.js'

let _available = null // null = unknown, true/false once probed

/** Probe (once, cached) whether the PostGIS geom column is usable. */
export async function postgisAvailable() {
  if (_available !== null) return _available
  try {
    // Confirms both the extension (ST_DWithin resolves) and the column exist.
    await prisma.$queryRawUnsafe(
      `SELECT ST_SRID(geom) FROM "Place" WHERE geom IS NOT NULL LIMIT 1`
    )
    _available = true
  } catch {
    _available = false
  }
  return _available
}

/** Force re-probe (e.g. after running the migration without a restart). */
export function resetPostgisProbe() {
  _available = null
}

const SHARED_COLUMNS = `
  id, name, "place_name_en" AS "placeNameEn", "place_name_local" AS "placeNameLocal",
  category, "google_type" AS "googleType", "google_types" AS "googleTypes",
  latitude, longitude, "zoomLevel", source, "user_id" AS "userId",
  "user_name" AS "userName", "user_email" AS "userEmail",
  "approval_status" AS "approvalStatus", "approved_at" AS "approvedAt", "createdAt"
`

/**
 * Nearest places within `radiusMeters`, ordered by true geographic distance.
 * Visibility: approved to everyone, plus the viewer's own pending/rejected.
 * @returns {Promise<Array|null>} rows, or null if PostGIS unavailable.
 */
export async function findNearbyPostgis({
  lat,
  lng,
  radiusMeters = 2000,
  excludeId = null,
  limit = 8,
  viewerId = null,
}) {
  if (!(await postgisAvailable())) return null
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT ${SHARED_COLUMNS},
              ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS "distanceMeters"
         FROM "Place"
        WHERE geom IS NOT NULL
          AND ($5::text IS NULL OR id <> $5)
          AND (approval_status = 'approved' OR ($6::text IS NOT NULL AND user_id = $6))
          AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT $4`,
      lng,
      lat,
      radiusMeters,
      limit,
      excludeId,
      viewerId
    )
    return rows
  } catch (e) {
    console.warn('[spatial] findNearbyPostgis failed, falling back:', e.message)
    return null
  }
}

/**
 * Places inside a GeoJSON polygon ring ([[lng,lat], …], closed), using
 * ST_Contains against the GiST index.
 * @param {number[][]} ring closed ring of [lng,lat] pairs
 * @returns {Promise<Array|null>} rows, or null if PostGIS unavailable.
 */
export async function findInPolygonPostgis({ ring, viewerId = null, limit = 2500 }) {
  if (!Array.isArray(ring) || ring.length < 4) return null
  if (!(await postgisAvailable())) return null
  try {
    // Build a WKT polygon from the ring. Coordinates are validated upstream.
    const wkt = `POLYGON((${ring.map(([x, y]) => `${Number(x)} ${Number(y)}`).join(', ')}))`
    const rows = await prisma.$queryRawUnsafe(
      `SELECT ${SHARED_COLUMNS}
         FROM "Place"
        WHERE geom IS NOT NULL
          AND (approval_status = 'approved' OR ($3::text IS NOT NULL AND user_id = $3))
          AND ST_Contains(ST_SetSRID(ST_GeomFromText($1), 4326), geom)
        ORDER BY "createdAt" DESC
        LIMIT $2`,
      wkt,
      limit,
      viewerId
    )
    return rows
  } catch (e) {
    console.warn('[spatial] findInPolygonPostgis failed, falling back:', e.message)
    return null
  }
}
