/** Place extract: max places per run, max drawn area (km²), one run per user per UTC calendar day. */
export const GRID_EXTRACT_MAX_PLACES = 20
export const EXTRACT_MAX_AREA_KM2 = parseFloat(process.env.EXTRACT_MAX_AREA_KM2) || 9

export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function usedGridExtractToday(lastGridExtractAt) {
  if (!lastGridExtractAt) return false
  const last = lastGridExtractAt instanceof Date ? lastGridExtractAt : new Date(lastGridExtractAt)
  if (Number.isNaN(last.getTime())) return false
  return utcDateKey(last) === utcDateKey()
}
