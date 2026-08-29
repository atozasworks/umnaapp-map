/** Build popup payload from API / client duplicate result */
export function buildDuplicatePopupPayload(dup, placeName = '') {
  if (!dup?.duplicate) return null
  return {
    message: dup.message,
    reason: dup.reason,
    placeName: placeName || dup.placeName || '',
    existingPlaceName: dup.existingPlaceName || null,
    existingPlaceId: dup.existingPlaceId || null,
  }
}

export function buildPlaceAddedPayload(places, { variant = 'manual', skippedCount = 0 } = {}) {
  const arr = (Array.isArray(places) ? places : [places]).filter(Boolean)
  if (!arr.length) return null
  return {
    places: arr.map((p) => ({
      id: p.id,
      name: p.place_name_en || p.name || 'Place',
      category: p.category,
    })),
    count: arr.length,
    skippedCount,
    variant,
  }
}
