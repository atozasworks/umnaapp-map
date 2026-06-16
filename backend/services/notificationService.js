import webpush from 'web-push'
import prisma from '../config/database.js'
import { getIo } from '../lib/socketIo.js'
import { festivalStatus, isFestivalPlace } from '../utils/festival.js'

export const NOTIFICATION_TYPES = {
  PLACE_SUBMITTED: 'place_submitted',
  PLACE_ADDED: 'place_added',
  PLACE_APPROVED: 'place_approved',
  FESTIVAL_TODAY: 'festival_today',
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
      url: '/home',
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
  // Targeted: only users who haven't muted the "new community place" category.
  const recipients = await recipientsForCategory('placeAdded', place.userId)
  if (!recipients.length) return

  const title = 'New place added'
  const body = `${actorName} added "${name}" (${place.category || 'Place'}).`
  const data = placePayload(place, { actorUserId: actor?.id, actorName })

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

/** Broadcast "this festival is happening" to every user (in-app + push). */
export async function notifyFestivalStarting(place, status) {
  if (!prisma.notification || !prisma.user) return 0
  const name = placeDisplayName(place)
  // Targeted: only users who haven't muted the "festival happening" category.
  const recipients = await recipientsForCategory('festival', null)
  if (!recipients.length) return 0

  const title = '🎪 Festival happening'
  const body = `"${name}" is on now${place.village ? ` at ${place.village}` : ''}. Tap to see it on the map.`
  const data = placePayload(place, {
    festival: true,
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

/**
 * Find festivals whose active window has begun and broadcast a one-time
 * "festival is happening" notification to all users. festivalNotifiedAt records
 * the occurrence start we last broadcast, so each occurrence fires once (yearly
 * festivals re-fire next year). Only approved festivals are broadcast so we
 * don't spam everyone with unverified submissions.
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
