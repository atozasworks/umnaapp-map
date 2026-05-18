/** Format length for map labels (compact). */
export const formatMeasureLabel = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

/** Panel display — kilometers. */
export const formatMeasureKm = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return '0 km'
  return `${(meters / 1000).toFixed(2)} km`
}

/** Panel display — miles. */
export const formatMeasureMiles = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return '0 mi'
  return `${(meters / 1609.344).toFixed(2)} mi`
}

export const METERS_PER_MILE = 1609.344
