let postgisRoadColumnPromise

/** Whether the optional PostGIS geometry column was created for Road. */
export async function hasPostgisRoadGeometry(prisma) {
  if (!postgisRoadColumnPromise) {
    postgisRoadColumnPromise = prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Road'
          AND column_name = 'geom'
      ) AS available
    `.then((rows) => Boolean(rows?.[0]?.available)).catch(() => false)
  }
  return postgisRoadColumnPromise
}

export function roadIntersectsBounds(geometry, bounds) {
  const coords = geometry?.type === 'LineString' ? geometry.coordinates : []
  if (!Array.isArray(coords) || !coords.length) return false
  const lngs = coords.map((point) => Number(point?.[0])).filter(Number.isFinite)
  const lats = coords.map((point) => Number(point?.[1])).filter(Number.isFinite)
  if (!lngs.length || !lats.length) return false
  return Math.max(...lngs) >= bounds.minLng && Math.min(...lngs) <= bounds.maxLng &&
    Math.max(...lats) >= bounds.minLat && Math.min(...lats) <= bounds.maxLat
}
