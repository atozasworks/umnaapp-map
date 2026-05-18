/** Format meters for list UI (compact). */
export function formatDistanceMeters(meters) {
  if (meters == null || !Number.isFinite(meters)) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}
