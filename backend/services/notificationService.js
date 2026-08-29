import webpush from 'web-push'
import prisma from '../config/database.js'
import { getIo } from '../lib/socketIo.js'
import { festivalStatus, isFestivalPlace } from '../utils/festival.js'
import { haversineMeters, radiusKmToDelta } from '../utils/geo.js'

export const NOTIFICATION_TYPES = {
  PLACE_SUBMITTED: 'place_submitted',
  PLACE_ADDED: 'place_added',
  PLACE_APPROVED: 'place_approved',
  FESTIVAL_TODAY: 'festival_today',
  BUSINESS_CLAIM_APPROVED: 'business_claim_approved',
  BUSINESS_CLAIM_REJECTED: 'business_claim_rejected',
  LOCATION_SHARE_VIEWED: 'location_share_viewed',
  LOCATION_SHARE_ENDED: 'location_share_ended',
}

/** Default radius for "near you" community notifications (place_added, festival). */
export function getNotifyNearRadiusKm() {
  const n = Number(process.env.NOTIFY_NEAR_RADIUS_KM)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 50
}

/** Pure geo check used by "near you" recipient filtering. */
export function isWithinNotifyRadius(lat1, lng1, lat2, lng2, radiusKm = getNotifyNearRadiusKm()) {
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return false
  return haversineMeters(lat1, lng1, lat2, lng2) <= radiusKm * 1000
}

/**
 * Maps a notification type to the user-preference flag that gates it. Types not
 * listed here (e.g. place_submitted — a direct response to the user's own
 * action) are always delivered and cannot be turned off.
 */
const PREF_KEY_BY_TYPE = {
  place_approved: 'placeApproved',
  place_added: 'placeAdded',
  festival_today: 'festival',
  business_claim_approved: 'businessClaim',
  business_claim_rejected: 'businessClaim',
  // location_share_* are transactional (always delivered when created)
}

/** Default preferences when a user has no preference row (everything on). */
export const DEFAULT_NOTIFICATION_PREFERENCE = {
  pushEnabled: true,
  placeApproved: true,
  placeAdded: true,
  festival: true,
  businessClaim: true,
}

export async function getNotificationPreference(userId) {
  if (!prisma.notificationPreference || !userId) return null
  try {
    return await prisma.notificationPreference.findUnique({ where: { userId } })
  } catch {
    return null
  }
}

/** Whether a notification of `type` should be created for a user given their prefs. */
function categoryEnabled(pref, type) {
  const key = PREF_KEY_BY_TYPE[type]
  if (!key) return true // always-on / transactional
  if (!pref) return true // no row => default on
  return pref[key] !== false
}

/**
 * Resolve the set of users opted in to a broadcast category. A missing
 * preference row counts as opted in. Converts former "broadcast to ALL users"
 * sends into targeted, opt-in deliveries. Falls back gracefully if the
 * preference model isn't migrated yet.
 */
async function recipientsForCategory(prefKey, excludeUserId) {
  const base = excludeUserId ? { id: { not: excludeUserId } } : {}
  if (prisma.notificationPreference) {
    try {
      return await prisma.user.findMany({
        where: {
          ...base,
          OR: [
            { notificationPreference: { is: null } },
            { notificationPreference: { [prefKey]: true } },
          ],
        },
        select: { id: true },
      })
    } catch (e) {
      console.warn('[notify] preference-aware recipient query failed, falling back:', e.message)
    }
  }
  return prisma.user.findMany({ where: base, select: { id: true } })
}

/**
 * Users with a location signal (favorite, contributed place, label, recent GPS,
 * or active live-share) within radiusKm of the given point.
 */
export async function findUserIdsNearPoint(userIds, lat, lng, radiusKm = getNotifyNearRadiusKm()) {
  const near = new Set()
  if (!userIds?.length || !Number.isFinite(lat) || !Number.isFinite(lng)) return near

  const delta = radiusKmToDelta(radiusKm)
  const latMin = lat - delta
  const latMax = lat + delta
  const lngMin = lng - delta
  const lngMax = lng + delta
  const inCandidates = { in: userIds }
  const inBbox = {
    latitude: { gte: latMin, lte: latMax },
    longitude: { gte: lngMin, lte: lngMax },
  }

  const consider = (userId, aLat, aLng) => {
    if (!userId || near.has(userId)) return
    if (isWithinNotifyRadius(aLat, aLng, lat, lng, radiusKm)) near.add(userId)
  }

  // Each source is isolated so a missing table/migration cannot abort the rest.
  const runSource = async (label, fn) => {
    try {
      await fn()
    } catch (e) {
      console.warn(`[notify] geo source "${label}" skipped:`, e.message)
    }
  }

  await runSource('favorite', async () => {
    if (!prisma.favorite) return
    const favs = await prisma.favorite.findMany({
      where: { userId: inCandidates, ...inBbox },
      select: { userId: true, latitude: true, longitude: true },
    })
    for (const f of favs) consider(f.userId, f.latitude, f.longitude)
  })

  await runSource('place', async () => {
    if (!prisma.place) return
    const places = await prisma.place.findMany({
      where: { userId: inCandidates, ...inBbox },
      select: { userId: true, latitude: true, longitude: true },
    })
    for (const p of places) consider(p.userId, p.latitude, p.longitude)
  })

  await runSource('placeLabel', async () => {
    if (!prisma.placeLabel) return
    const labels = await prisma.placeLabel.findMany({
      where: {
        userId: inCandidates,
        latitude: { gte: latMin, lte: latMax },
        longitude: { gte: lngMin, lte: lngMax },
      },
      select: { userId: true, latitude: true, longitude: true },
    })
    for (const l of labels) consider(l.userId, l.latitude, l.longitude)
  })

  await runSource('location', async () => {
    if (!prisma.location) return
    const locs = await prisma.location.findMany({
      where: { userId: inCandidates, ...inBbox },
      orderBy: { timestamp: 'desc' },
      take: Math.min(userIds.length * 5, 5000),
      select: { userId: true, latitude: true, longitude: true },
    })
    for (const loc of locs) consider(loc.userId, loc.latitude, loc.longitude)
  })

  await runSource('liveLocationShare', async () => {
    if (!prisma.liveLocationShare) return
    const shares = await prisma.liveLocationShare.findMany({
      where: {
        ownerId: inCandidates,
        status: 'active',
        lastLatitude: { gte: latMin, lte: latMax },
        lastLongitude: { gte: lngMin, lte: lngMax },
      },
      select: { ownerId: true, lastLatitude: true, lastLongitude: true },
    })
    for (const s of shares) consider(s.ownerId, s.lastLatitude, s.lastLongitude)
  })

  return near
}

/**
 * Preference-opted recipients who also have a geographic anchor near the place.
 * Used for "near you" community notifications — never broadcast globally.
 */
async function recipientsNearPlace(place, prefKey, excludeUserId) {
  const candidates = await recipientsForCategory(prefKey, excludeUserId)
  if (!candidates.length) return []

  const lat = Number(place?.latitude)
  const lng = Number(place?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn('[notify] place missing coordinates — skipping near-you broadcast')
    return []
  }

  const radiusKm = getNotifyNearRadiusKm()
  const nearIds = await findUserIdsNearPoint(
    candidates.map((u) => u.id),
    lat,
    lng,
    radiusKm
  )
  const filtered = candidates.filter((u) => nearIds.has(u.id))
  console.log(
    `[notify] near-you ${prefKey}: ${filtered.length}/${candidates.length} recipient(s) within ${radiusKm}km`
  )
  return filtered
}

let vapidConfigured = false

function configureVapid() {
  if (vapidConfigured) return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  const pub = process.env.VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!pub || !priv) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || 'mailto:support@umnaapp.in',
    pub,
    priv
  )
  vapidConfigured = true
  return true
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null
}

export function serializeNotification(row) {
  if (!row) return null
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data ?? null,
    read: row.read,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }
}

function placeDisplayName(place) {
  return (place.placeNameEn || place.name || 'Untitled place').trim()
}

function placePayload(place, extra = {}) {
  return {
    placeId: place.id,
    placeName: placeDisplayName(place),
    category: place.category || null,
    latitude: place.latitude,
    longitude: place.longitude,
    ...extra,
  }
}

async function deliverToUser(userId, notification, pref) {
  const payload = serializeNotification(notification)
  const io = getIo()
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', payload)
    const count = await prisma.notification.count({ where: { userId, read: false } })
    io.to(`user:${userId}`).emit('notification:unread-count', { count })
  }
  const pushEnabled = !pref || pref.pushEnabled !== false
  if (!pushEnabled) {
    return
  }
  if (configureVapid()) {
    sendPushToUser(userId, payload).catch((err) => {
      console.warn('[push] delivery failed:', err.message)
    })
  } else {
    console.warn('[push] skipped — VAPID not configured (set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY in backend/.env and restart)')
  }
}

async function sendPushToUser(userId, notification) {
  if (!prisma.pushSubscription) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (!subs.length) {
    console.log(`[push] no subscriptions for user ${userId}`)
    return
  }

  const pushPayload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    data: {
      ...notification.data,
      notificationId: notification.id,
      type: notification.type,
      url: '/',
    },
  })

  console.log(`[push] sending to ${subs.length} subscription(s) for user ${userId}: "${notification.title}"`)

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const res = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        )
        console.log(`[push] OK ${res.statusCode} → ${sub.endpoint.slice(0, 60)}…`)
        return { ok: true, statusCode: res.statusCode }
      } catch (err) {
        console.warn(
          `[push] FAIL ${err.statusCode || '?'} → ${sub.endpoint.slice(0, 60)}…  body=${err.body || err.message}`
        )
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
        return { ok: false, statusCode: err.statusCode, message: err.message }
      }
    })
  )

  return results
}

export async function createUserNotification({ userId, type, title, body, data }) {
  if (!prisma.notification) {
    console.warn('[notify] prisma.notification model unavailable')
    return null
  }
  if (!userId) {
    console.warn('[notify] createUserNotification: missing userId, type=', type)
    return null
  }
  const pref = await getNotificationPreference(userId)
  if (!categoryEnabled(pref, type)) {
    console.log(`[notify] skipped type=${type} → user=${userId} (category muted)`)
    return null
  }
  let notification
  try {
    notification = await prisma.notification.create({
      data: { userId, type, title, body, data: data ?? undefined },
    })
  } catch (e) {
    console.error('[notify] DB insert failed:', e.message, { userId, type, data })
    return null
  }
  console.log(`[notify] created id=${notification.id} type=${type} → user=${userId}`)
  try {
    await deliverToUser(userId, notification, pref)
  } catch (e) {
    console.error('[notify] deliverToUser failed:', e)
  }
  return notification
}

export async function notifyPlaceSubmitted(place, actor) {
  const name = placeDisplayName(place)
  await createUserNotification({
    userId: place.userId,
    type: NOTIFICATION_TYPES.PLACE_SUBMITTED,
    title: 'Place submitted',
    body: `Your place "${name}" is pending review.`,
    data: placePayload(place, { actorUserId: actor?.id, actorName: actor?.name }),
  })
}

export async function notifyPlaceAddedToCommunity(place, actor) {
  if (!prisma.notification || !prisma.user) return
  const name = placeDisplayName(place)
  const actorName = (actor?.name || 'Someone').trim()
  // Opt-in category + geographic "near you" filter (favorites / contributions / GPS).
  const recipients = await recipientsNearPlace(place, 'placeAdded', place.userId)
  if (!recipients.length) return

  const title = 'New place added'
  const body = `${actorName} added "${name}" near you (${place.category || 'Place'}).`
  const data = placePayload(place, { actorUserId: actor?.id, actorName, nearYou: true })

  await Promise.all(
    recipients.map((u) =>
      createUserNotification({
        userId: u.id,
        type: NOTIFICATION_TYPES.PLACE_ADDED,
        title,
        body,
        data,
      })
    )
  )
}

export async function notifyPlaceApproved(place, { approvedBy = 'admin' } = {}) {
  const name = placeDisplayName(place)
  const byLabel = approvedBy === 'auto' ? 'automatically' : 'by an admin'
  await createUserNotification({
    userId: place.userId,
    type: NOTIFICATION_TYPES.PLACE_APPROVED,
    title: 'Place approved',
    body: `"${name}" was approved ${byLabel} and is now on the map.`,
    data: placePayload(place, { approvedBy }),
  })
}

/** After a place is created (contribution flow). */
export async function onPlaceCreated(place, actor) {
  if (!place) {
    console.warn('[notify] onPlaceCreated: missing place')
    return
  }
  if (place.source === 'saved') {
    console.log(`[notify] onPlaceCreated: skipping saved place ${place.id}`)
    return
  }
  console.log(`[notify] onPlaceCreated: place=${place.id} owner=${place.userId}`)
  try {
    await notifyPlaceSubmitted(place, actor)
    await notifyPlaceAddedToCommunity(place, actor)
  } catch (e) {
    console.error('[notify] onPlaceCreated FAILED:', e)
  }
}

/** When approval status becomes approved. */
export async function onPlaceApproved(place, options) {
  if (!place) {
    console.warn('[notify] onPlaceApproved: missing place')
    return
  }
  if (place.approvalStatus !== 'approved') {
    console.warn(`[notify] onPlaceApproved: place.approvalStatus="${place.approvalStatus}" — skipping`)
    return
  }
  console.log(`[notify] onPlaceApproved: place=${place.id} owner=${place.userId}`)
  try {
    await notifyPlaceApproved(place, options)
  } catch (e) {
    console.error('[notify] onPlaceApproved FAILED:', e)
  }
}

export async function onPlacesAutoApproved(placeIds) {
  if (!placeIds?.length || !prisma.place) return
  const places = await prisma.place.findMany({
    where: { id: { in: placeIds }, approvalStatus: 'approved' },
  })
  for (const place of places) {
    await onPlaceApproved(place, { approvedBy: 'auto' })
  }
}

/** Notify opted-in users near the festival (in-app + push via createUserNotification). */
export async function notifyFestivalStarting(place, status) {
  if (!prisma.notification || !prisma.user) return 0
  const name = placeDisplayName(place)
  // Opt-in festival category + geographic "near you" filter.
  const recipients = await recipientsNearPlace(place, 'festival', null)
  if (!recipients.length) return 0

  const title = '🎪 Festival happening'
  const body = `"${name}" is happening near you${place.village ? ` (${place.village})` : ''}. Tap to see it on the map.`
  const data = placePayload(place, {
    festival: true,
    nearYou: true,
    startISO: status?.startISO ?? null,
    endISO: status?.endISO ?? null,
  })

  await Promise.all(
    recipients.map((u) =>
      createUserNotification({
        userId: u.id,
        type: NOTIFICATION_TYPES.FESTIVAL_TODAY,
        title,
        body,
        data,
      })
    )
  )
  return recipients.length
}

/** Business claim approved — full delivery path (prefs + socket + push). */
export async function notifyBusinessClaimApproved(claim, { placeId } = {}) {
  const id = placeId || claim?.placeId
  return createUserNotification({
    userId: claim.userId,
    type: NOTIFICATION_TYPES.BUSINESS_CLAIM_APPROVED,
    title: 'Business claim approved',
    body: 'Your ownership claim has been verified. You now have a verified owner badge on this place.',
    data: { placeId: id },
  })
}

/** Business claim rejected — full delivery path (prefs + socket + push). */
export async function notifyBusinessClaimRejected(claim, { placeId, note } = {}) {
  const id = placeId || claim?.placeId
  return createUserNotification({
    userId: claim.userId,
    type: NOTIFICATION_TYPES.BUSINESS_CLAIM_REJECTED,
    title: 'Business claim not approved',
    body: (note && String(note).trim()) || 'Your ownership claim was reviewed but could not be verified.',
    data: { placeId: id },
  })
}

/**
 * Find festivals whose active window has begun and notify nearby opted-in users
 * once per occurrence. festivalNotifiedAt records the occurrence start we last
 * notified, so each occurrence fires once (yearly festivals re-fire next year).
 * Only approved festivals are considered.
 */
export async function notifyFestivalsStartingToday() {
  if (!prisma.place) return { count: 0 }
  const now = new Date()
  let candidates
  try {
    candidates = await prisma.place.findMany({
      where: {
        approvalStatus: 'approved',
        OR: [{ category: 'Festival' }, { festivalStartDate: { not: null } }],
      },
    })
  } catch (e) {
    // festival_notified_at column / prisma client may be missing on old DBs.
    console.warn('[notify] notifyFestivalsStartingToday query failed:', e.message)
    return { count: 0 }
  }

  let notified = 0
  for (const place of candidates) {
    if (!isFestivalPlace(place)) continue
    const status = festivalStatus(place, now)
    if (!status || !status.active) continue

    const alreadyNotified =
      place.festivalNotifiedAt &&
      new Date(place.festivalNotifiedAt).getTime() >= status.start.getTime()
    if (alreadyNotified) continue

    try {
      const sent = await notifyFestivalStarting(place, status)
      await prisma.place.update({
        where: { id: place.id },
        data: { festivalNotifiedAt: now },
      })
      if (sent > 0) notified += 1
      console.log(`[notify] festival "${placeDisplayName(place)}" broadcast to ${sent} user(s)`)
    } catch (e) {
      console.error('[notify] notifyFestivalStarting failed:', e.message)
    }
  }
  return { count: notified }
}

export async function notifyLiveLocationViewed(share, viewer) {
  if (!share?.ownerId || !viewer?.id || share.ownerId === viewer.id) return null
  const viewerName = (viewer.name || 'Someone').trim()
  return createUserNotification({
    userId: share.ownerId,
    type: NOTIFICATION_TYPES.LOCATION_SHARE_VIEWED,
    title: 'Live location viewed',
    body: `${viewerName} opened your live-location link.`,
    data: {
      shareId: share.id,
      viewerUserId: viewer.id,
      viewerName,
    },
  })
}

export async function notifyLiveLocationEnded(share, { reason = 'stopped' } = {}) {
  if (!share?.id) return
  const ownerName = (share.owner?.name || 'Someone').trim()
  const viewers = await prisma.liveLocationViewer.findMany({
    where: { shareId: share.id, userId: { not: share.ownerId } },
    select: { userId: true },
  })
  const title = reason === 'expired' ? 'Live location expired' : 'Live location ended'
  const body =
    reason === 'expired'
      ? `${ownerName}'s live-location share has expired.`
      : `${ownerName} stopped sharing live location.`

  await Promise.all(
    viewers.map((viewer) =>
      createUserNotification({
        userId: viewer.userId,
        type: NOTIFICATION_TYPES.LOCATION_SHARE_ENDED,
        title,
        body,
        data: { shareId: share.id, reason, ownerName },
      })
    )
  )
}
