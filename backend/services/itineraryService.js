import crypto from 'crypto'
import prisma from '../config/database.js'
import { getIo } from '../lib/socketIo.js'
import { createUserNotification } from './notificationService.js'
import { emailTransporter, smtpConfig } from '../config/atozasAuth.js'

/**
 * Co-Edited Group Itineraries service.
 *
 * Membership model:
 *   - owner  : full control (rename, delete, manage members, toggle auto-sort)
 *   - editor : add / edit / remove stops, comment, vote
 *   - viewer : read-only + vote + comment
 *
 * Anyone with the share link can join as an editor (open collaboration), which
 * matches the "share and invite via link" goal. Tighten ROLE_FOR_LINK_JOIN if a
 * future product decision wants link joiners to be viewers by default.
 */

export const ITINERARY_ROLES = { OWNER: 'owner', EDITOR: 'editor', VIEWER: 'viewer' }
const ROLE_FOR_LINK_JOIN = ITINERARY_ROLES.EDITOR

export const ITINERARY_NOTIFICATION_TYPES = {
  INVITE: 'itinerary_invite',
  JOINED: 'itinerary_joined',
  UPDATED: 'itinerary_updated',
}

const ROLE_RANK = { viewer: 0, editor: 1, owner: 2 }

export function itineraryRoom(itineraryId) {
  return `itinerary:${itineraryId}`
}

export function newShareToken() {
  return crypto.randomBytes(12).toString('hex')
}

function actorName(user) {
  return (user?.name || user?.email || 'Someone').trim()
}

// ---------------------------------------------------------------------------
// Serialization (DB rows -> API payloads). Stops carry an aggregated vote
// summary plus the requesting user's own vote so the client can render state
// without an extra round-trip.
// ---------------------------------------------------------------------------
function summarizeVotes(votes = [], viewerUserId) {
  let likes = 0
  let dislikes = 0
  let myVote = 0
  for (const v of votes) {
    if (v.value > 0) likes += 1
    else if (v.value < 0) dislikes += 1
    if (v.userId === viewerUserId) myVote = v.value
  }
  return { likes, dislikes, score: likes - dislikes, myVote }
}

export function serializeComment(c) {
  if (!c) return null
  return {
    id: c.id,
    stopId: c.stopId,
    userId: c.userId,
    userName: c.userName || null,
    body: c.body,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  }
}

export function serializeStop(stop, viewerUserId) {
  if (!stop) return null
  const voteSummary = summarizeVotes(stop.votes, viewerUserId)
  return {
    id: stop.id,
    itineraryId: stop.itineraryId,
    placeId: stop.placeId || null,
    name: stop.name,
    category: stop.category || null,
    latitude: stop.latitude,
    longitude: stop.longitude,
    address: stop.address || null,
    notes: stop.notes || null,
    position: stop.position,
    dayIndex: stop.dayIndex ?? null,
    addedById: stop.addedById || null,
    addedByName: stop.addedByName || null,
    votes: voteSummary,
    commentCount: Array.isArray(stop.comments) ? stop.comments.length : (stop._count?.comments ?? 0),
    comments: Array.isArray(stop.comments) ? stop.comments.map(serializeComment) : undefined,
    createdAt: stop.createdAt instanceof Date ? stop.createdAt.toISOString() : stop.createdAt,
    updatedAt: stop.updatedAt instanceof Date ? stop.updatedAt.toISOString() : stop.updatedAt,
  }
}

export function serializeMember(m) {
  if (!m) return null
  return {
    id: m.id,
    userId: m.userId,
    role: m.role,
    name: m.user?.name || null,
    email: m.user?.email || null,
    picture: m.user?.picture || null,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  }
}

export function serializeItinerary(it, viewerUserId, { includeStops = true } = {}) {
  if (!it) return null
  const myMembership = it.members?.find((m) => m.userId === viewerUserId) || null
  return {
    id: it.id,
    title: it.title,
    description: it.description || null,
    ownerId: it.ownerId,
    coverEmoji: it.coverEmoji || null,
    shareToken: it.shareToken,
    startDate: it.startDate instanceof Date ? it.startDate.toISOString() : it.startDate,
    endDate: it.endDate instanceof Date ? it.endDate.toISOString() : it.endDate,
    autoSort: it.autoSort,
    myRole: myMembership?.role || (it.ownerId === viewerUserId ? 'owner' : null),
    memberCount: it.members?.length ?? it._count?.members ?? 0,
    stopCount: it.stops?.length ?? it._count?.stops ?? 0,
    members: it.members ? it.members.map(serializeMember) : undefined,
    stops: includeStops && it.stops ? it.stops.map((s) => serializeStop(s, viewerUserId)) : undefined,
    createdAt: it.createdAt instanceof Date ? it.createdAt.toISOString() : it.createdAt,
    updatedAt: it.updatedAt instanceof Date ? it.updatedAt.toISOString() : it.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
const STOP_INCLUDE = {
  votes: true,
  _count: { select: { comments: true } },
}

export async function getItineraryForViewer(itineraryId, viewerUserId, { withStops = true } = {}) {
  const it = await prisma.itinerary.findUnique({
    where: { id: itineraryId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, picture: true } } } },
      stops: withStops
        ? { include: STOP_INCLUDE, orderBy: { position: 'asc' } }
        : false,
    },
  })
  return it
}

/**
 * Returns the requesting user's role for an itinerary, or null if not a member.
 * Owner is always treated as 'owner' even if a member row is missing.
 */
export function memberRole(itinerary, userId) {
  if (!itinerary) return null
  if (itinerary.ownerId === userId) return ITINERARY_ROLES.OWNER
  const m = itinerary.members?.find((mm) => mm.userId === userId)
  return m?.role || null
}

export function roleAtLeast(role, minRole) {
  return (ROLE_RANK[role] ?? -1) >= (ROLE_RANK[minRole] ?? 99)
}

/**
 * Assert membership at a minimum role. Throws an http-style error object that
 * routes translate to a status code.
 */
export function assertRole(itinerary, userId, minRole) {
  const role = memberRole(itinerary, userId)
  if (!role) {
    const err = new Error('You are not a member of this itinerary')
    err.status = 403
    throw err
  }
  if (!roleAtLeast(role, minRole)) {
    const err = new Error('You do not have permission to do that')
    err.status = 403
    throw err
  }
  return role
}

// ---------------------------------------------------------------------------
// Auto-reorder: sort stops by net vote score (desc), keeping current order as a
// stable tie-breaker. Persists the new `position` values and returns true if
// anything changed. Called after a vote when autoSort is on.
// ---------------------------------------------------------------------------
export async function reorderStopsByVotes(itineraryId) {
  const stops = await prisma.itineraryStop.findMany({
    where: { itineraryId },
    include: { votes: true },
    orderBy: { position: 'asc' },
  })
  const scored = stops.map((s, idx) => {
    const { score } = summarizeVotes(s.votes)
    return { id: s.id, score, originalIndex: idx, currentPosition: s.position }
  })
  scored.sort((a, b) => (b.score - a.score) || (a.originalIndex - b.originalIndex))

  const updates = []
  scored.forEach((s, newIndex) => {
    if (s.currentPosition !== newIndex) {
      updates.push(prisma.itineraryStop.update({ where: { id: s.id }, data: { position: newIndex } }))
    }
  })
  if (updates.length) await prisma.$transaction(updates)
  return updates.length > 0
}

/** Compact positions to 0..n-1 in current order (used after add/remove). */
export async function normalizePositions(itineraryId) {
  const stops = await prisma.itineraryStop.findMany({
    where: { itineraryId },
    orderBy: { position: 'asc' },
    select: { id: true, position: true },
  })
  const updates = []
  stops.forEach((s, idx) => {
    if (s.position !== idx) updates.push(prisma.itineraryStop.update({ where: { id: s.id }, data: { position: idx } }))
  })
  if (updates.length) await prisma.$transaction(updates)
}

export async function touchItinerary(itineraryId) {
  await prisma.itinerary.update({ where: { id: itineraryId }, data: { updatedAt: new Date() } }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Real-time: broadcast a change to everyone in the itinerary room. The client
// reacts by re-fetching (or patching) the affected itinerary.
// ---------------------------------------------------------------------------
export function broadcastItinerary(itineraryId, event, payload = {}, { exceptSocketId } = {}) {
  const io = getIo()
  if (!io) return
  const room = io.to(itineraryRoom(itineraryId))
  room.emit('itinerary:update', { itineraryId, event, ...payload, at: Date.now() })
}

// ---------------------------------------------------------------------------
// Notifications to members (in-app + push), skipping the actor.
// ---------------------------------------------------------------------------
export async function notifyMembers(itinerary, { type, title, body, data, exceptUserId }) {
  if (!itinerary?.members?.length) return
  await Promise.all(
    itinerary.members
      .filter((m) => m.userId !== exceptUserId)
      .map((m) =>
        createUserNotification({
          userId: m.userId,
          type,
          title,
          body,
          data: { itineraryId: itinerary.id, ...data },
        }).catch(() => {})
      )
  )
}

export async function notifyItineraryInvite(itinerary, invitee, actor) {
  await createUserNotification({
    userId: invitee.id,
    type: ITINERARY_NOTIFICATION_TYPES.INVITE,
    title: '🗺️ Trip invitation',
    body: `${actorName(actor)} invited you to "${itinerary.title}". Tap to join.`,
    data: {
      itineraryId: itinerary.id,
      shareToken: itinerary.shareToken,
      joinUrl: buildJoinUrl(itinerary),
      actorName: actorName(actor),
    },
  }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Email invites: send the invitee a real email with a join link. The link
// drops them into the app (login/signup if needed) and auto-joins the trip via
// ?joinTrip=<shareToken>, so they only appear as a member once they accept.
// ---------------------------------------------------------------------------
function frontendOrigin() {
  const raw =
    process.env.FRONTEND_URL ||
    (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',')[0].trim() : '') ||
    'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

export function buildJoinUrl(itinerary) {
  return `${frontendOrigin()}/home?joinTrip=${itinerary.shareToken}`
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Send a trip invitation email. Returns { ok, skipped?, error? } and never
 * throws, so callers can surface a friendly message without failing the request.
 */
export async function sendItineraryInviteEmail({ to, itinerary, inviter }) {
  if (!emailTransporter || !smtpConfig?.email) {
    console.warn('[itineraries] invite email skipped — SMTP not configured')
    return { ok: false, skipped: true }
  }
  const joinUrl = buildJoinUrl(itinerary)
  const inviterLabel = actorName(inviter)
  const tripTitle = itinerary.title || 'a trip'
  const emoji = itinerary.coverEmoji || '🗺️'

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9;">
        <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:32px;text-align:center;color:#fff;">
            <div style="font-size:40px;line-height:1;">${escapeHtml(emoji)}</div>
            <h1 style="margin:12px 0 0 0;font-size:22px;">You're invited to plan a trip!</h1>
          </div>
          <div style="padding:32px;color:#1e293b;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 8px 0;">
              <strong>${escapeHtml(inviterLabel)}</strong> invited you to collaborate on
            </p>
            <p style="font-size:20px;font-weight:700;color:#4f46e5;margin:0 0 20px 0;">${escapeHtml(tripTitle)}</p>
            <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px 0;">
              Add places, vote on where to go, discuss each stop, and build the route together — in real time.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${joinUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 32px;border-radius:10px;">
                Join the trip
              </a>
            </div>
            <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
              Or paste this link into your browser:<br>
              <a href="${joinUrl}" style="color:#6366f1;word-break:break-all;">${escapeHtml(joinUrl)}</a>
            </p>
            <p style="font-size:11px;color:#cbd5e1;margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = [
    `${inviterLabel} invited you to collaborate on the trip "${tripTitle}" in UMNAAPP.`,
    ``,
    `Join the trip: ${joinUrl}`,
    ``,
    `Add places, vote, discuss, and build the route together in real time.`,
    `If you didn't expect this invitation, you can ignore this email.`,
  ].join('\n')

  try {
    const info = await emailTransporter.sendMail({
      from: `"UMNAAPP Trips" <${smtpConfig.email}>`,
      to,
      subject: `${inviterLabel} invited you to "${tripTitle}" 🗺️`,
      text,
      html,
      replyTo: smtpConfig.email,
      envelope: { from: smtpConfig.email, to },
    })
    if (info?.rejected?.length) {
      return { ok: false, error: 'rejected' }
    }
    console.log(`[itineraries] invite email sent to ${to} for "${tripTitle}"`)
    return { ok: true }
  } catch (err) {
    console.error('[itineraries] invite email failed:', err.message)
    return { ok: false, error: err.message }
  }
}

export { ROLE_FOR_LINK_JOIN }
