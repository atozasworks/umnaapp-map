/** Comma-separated user UUIDs allowed to delete any place via /api/map/places/:id */
function parseAdminUserIds() {
  const raw = process.env.PLACE_DELETE_ADMIN_USER_IDS || ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Comma-separated emails (case-insensitive) with full place delete access */
function parseAdminEmails() {
  const raw = process.env.PLACE_DELETE_ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isPlaceDeleteAdmin(user) {
  if (!user?.id) return false
  if (parseAdminUserIds().includes(String(user.id))) return true
  const email = user.email ? String(user.email).trim().toLowerCase() : ''
  if (email && parseAdminEmails().includes(email)) return true
  return false
}

export function getPlaceCreatorId(place) {
  if (!place) return null
  return place.userId ?? place.user_id ?? null
}

export function isPlaceOwner(place, user) {
  if (!user?.id || !place) return false
  const creatorId = getPlaceCreatorId(place)
  return creatorId != null && String(creatorId) === String(user.id)
}

/** Creator or configured admin may delete via the map API */
export function canUserDeletePlace(place, user) {
  if (!user?.id || !place) return false
  if (isPlaceDeleteAdmin(user)) return true
  return isPlaceOwner(place, user)
}
