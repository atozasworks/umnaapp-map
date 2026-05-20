/** Creator user id on a place record (supports legacy snake_case). */
export function getPlaceCreatorId(place) {
  if (!place) return null
  return place.userId ?? place.user_id ?? null
}

/** True when the logged-in user contributed this place */
export function isPlaceOwner(place, user) {
  if (!user?.id || !place) return false
  const creatorId = getPlaceCreatorId(place)
  return creatorId != null && String(creatorId) === String(user.id)
}

/** Creator or server-flagged admin may delete */
export function canDeletePlace(place, user) {
  if (!user?.id || !place) return false
  if (user.isPlaceDeleteAdmin) return true
  return isPlaceOwner(place, user)
}
