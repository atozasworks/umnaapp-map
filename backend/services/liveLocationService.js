import crypto from 'crypto'
import prisma from '../config/database.js'
import { getIo } from '../lib/socketIo.js'
import {
  notifyLiveLocationEnded,
  notifyLiveLocationViewed,
} from './notificationService.js'

export const LIVE_LOCATION_DURATIONS = Object.freeze([15, 60, 480, 1440])
export const LIVE_LOCATION_STATUSES = Object.freeze({
  ACTIVE: 'active',
  STOPPED: 'stopped',
  EXPIRED: 'expired',
})
export const LIVE_LOCATION_PRESENCE = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
})

const OWNER_SELECT = { id: true, name: true, picture: true }
const SHARE_INCLUDE = {
  owner: { select: OWNER_SELECT },
  _count: { select: { viewers: true } },
}

function iso(value) {
  return value instanceof Date ? value.toISOString() : value
}

export function generateLiveLocationToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashLiveLocationToken(token) {
  return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex')
}

export function liveLocationRoom(shareId) {
  return `live-location:${shareId}`
}

export function serializeLiveLocationShare(share, viewerUserId) {
  if (!share) return null
  const hasPoint = share.lastLatitude != null && share.lastLongitude != null
  return {
    id: share.id,
    ownerId: share.ownerId,
    owner: share.owner
      ? {
          id: share.owner.id,
          name: share.owner.name || null,
          picture: share.owner.picture || null,
        }
      : undefined,
    status: share.status,
    durationMinutes: share.durationMinutes,
    expiresAt: iso(share.expiresAt),
    endedAt: iso(share.endedAt) || null,
    endedReason: share.endedReason || null,
    presenceStatus: share.presenceStatus,
    latestPoint: hasPoint
      ? {
          latitude: share.lastLatitude,
          longitude: share.lastLongitude,
          accuracy: share.lastAccuracy ?? null,
          speed: share.lastSpeed ?? null,
          heading: share.lastHeading ?? null,
          updatedAt: iso(share.lastUpdatedAt),
        }
      : null,
    viewerCount: share._count?.viewers,
    isOwner: viewerUserId ? share.ownerId === viewerUserId : undefined,
    createdAt: iso(share.createdAt),
    updatedAt: iso(share.updatedAt),
  }
}

export function broadcastLiveLocation(shareId, event, payload = {}) {
  const io = getIo()
  if (!io) return
  io.to(liveLocationRoom(shareId)).emit(event, {
    shareId,
    ...payload,
    at: Date.now(),
  })
}

export function broadcastLiveLocationStatus(share) {
  broadcastLiveLocation(share.id, 'live-location:status', {
    status: share.status,
    presenceStatus: share.presenceStatus,
    endedAt: iso(share.endedAt) || null,
    reason: share.endedReason || null,
  })
}

async function expireShareIfDue(share, now = new Date()) {
  if (
    !share ||
    share.status !== LIVE_LOCATION_STATUSES.ACTIVE ||
    new Date(share.expiresAt).getTime() > now.getTime()
  ) {
    return share
  }

  const result = await prisma.liveLocationShare.updateMany({
    where: {
      id: share.id,
      status: LIVE_LOCATION_STATUSES.ACTIVE,
      expiresAt: { lte: now },
    },
    data: {
      status: LIVE_LOCATION_STATUSES.EXPIRED,
      endedAt: now,
      endedReason: 'expired',
      presenceStatus: LIVE_LOCATION_PRESENCE.PAUSED,
    },
  })
  if (!result.count) {
    return prisma.liveLocationShare.findUnique({ where: { id: share.id }, include: SHARE_INCLUDE })
  }

  const expired = {
    ...share,
    status: LIVE_LOCATION_STATUSES.EXPIRED,
    endedAt: now,
    endedReason: 'expired',
    presenceStatus: LIVE_LOCATION_PRESENCE.PAUSED,
  }
  broadcastLiveLocationStatus(expired)
  return expired
}

export async function getLiveLocationParticipantShare(shareId, userId) {
  const share = await prisma.liveLocationShare.findFirst({
    where: {
      id: shareId,
      OR: [{ ownerId: userId }, { viewers: { some: { userId } } }],
    },
    include: SHARE_INCLUDE,
  })
  return expireShareIfDue(share)
}

export async function createLiveLocationShare(ownerId, durationMinutes) {
  const now = new Date()
  const activeShares = await prisma.liveLocationShare.findMany({
    where: { ownerId, status: LIVE_LOCATION_STATUSES.ACTIVE },
    select: { id: true },
  })
  for (const existing of activeShares) {
    await stopLiveLocationShare(existing.id, ownerId, 'replaced')
  }

  const token = generateLiveLocationToken()
  const share = await prisma.liveLocationShare.create({
    data: {
      ownerId,
      tokenHash: hashLiveLocationToken(token),
      durationMinutes,
      expiresAt: new Date(now.getTime() + durationMinutes * 60 * 1000),
    },
    include: SHARE_INCLUDE,
  })
  return { share, token }
}

export async function getActiveOwnedLiveLocationShare(ownerId) {
  await expireDueLiveLocationShares()
  const share = await prisma.liveLocationShare.findFirst({
    where: {
      ownerId,
      status: LIVE_LOCATION_STATUSES.ACTIVE,
      expiresAt: { gt: new Date() },
    },
    include: SHARE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
  return share
}

export async function rotateLiveLocationToken(shareId, ownerId) {
  const existing = await prisma.liveLocationShare.findFirst({
    where: {
      id: shareId,
      ownerId,
      status: LIVE_LOCATION_STATUSES.ACTIVE,
      expiresAt: { gt: new Date() },
    },
    include: SHARE_INCLUDE,
  })
  if (!existing) return null

  const token = generateLiveLocationToken()
  const updated = await prisma.liveLocationShare.update({
    where: { id: shareId },
    data: { tokenHash: hashLiveLocationToken(token) },
    include: SHARE_INCLUDE,
  })
  return { share: updated, token }
}

export async function exchangeLiveLocationToken(token, userId, viewerProfile = null) {
  const now = new Date()
  const share = await prisma.liveLocationShare.findUnique({
    where: { tokenHash: hashLiveLocationToken(token) },
    include: SHARE_INCLUDE,
  })
  const current = await expireShareIfDue(share, now)
  if (
    !current ||
    current.status !== LIVE_LOCATION_STATUSES.ACTIVE ||
    new Date(current.expiresAt).getTime() <= now.getTime()
  ) {
    return null
  }

  const existingViewer = await prisma.liveLocationViewer.findUnique({
    where: { shareId_userId: { shareId: current.id, userId } },
  })

  await prisma.liveLocationViewer.upsert({
    where: { shareId_userId: { shareId: current.id, userId } },
    create: { shareId: current.id, userId, firstViewedAt: now, lastViewedAt: now },
    update: { lastViewedAt: now },
  })

  // Notify owner only on first open by a different user — never include coordinates.
  if (!existingViewer && current.ownerId !== userId) {
    notifyLiveLocationViewed(current, {
      id: userId,
      name: viewerProfile?.name || null,
    }).catch(() => {})
  }

  return prisma.liveLocationShare.findUnique({ where: { id: current.id }, include: SHARE_INCLUDE })
}

export async function stopLiveLocationShare(shareId, ownerId, reason = 'revoked') {
  const existing = await prisma.liveLocationShare.findFirst({
    where: { id: shareId, ownerId },
    include: {
      ...SHARE_INCLUDE,
      viewers: { select: { userId: true } },
    },
  })
  if (!existing) return null

  const current = await expireShareIfDue(existing)
  if (current.status !== LIVE_LOCATION_STATUSES.ACTIVE) return current

  const now = new Date()
  const result = await prisma.liveLocationShare.updateMany({
    where: { id: shareId, ownerId, status: LIVE_LOCATION_STATUSES.ACTIVE },
    data: {
      status: LIVE_LOCATION_STATUSES.STOPPED,
      endedAt: now,
      endedReason: reason,
      presenceStatus: LIVE_LOCATION_PRESENCE.PAUSED,
    },
  })
  if (!result.count) {
    return prisma.liveLocationShare.findUnique({ where: { id: shareId }, include: SHARE_INCLUDE })
  }

  const stopped = {
    ...current,
    status: LIVE_LOCATION_STATUSES.STOPPED,
    endedAt: now,
    endedReason: reason,
    presenceStatus: LIVE_LOCATION_PRESENCE.PAUSED,
  }
  broadcastLiveLocationStatus(stopped)
  if (reason !== 'replaced') {
    notifyLiveLocationEnded(stopped, { reason: 'stopped' }).catch(() => {})
  }
  return stopped
}

export async function expireDueLiveLocationShares(now = new Date()) {
  const due = await prisma.liveLocationShare.findMany({
    where: { status: LIVE_LOCATION_STATUSES.ACTIVE, expiresAt: { lte: now } },
    include: {
      owner: { select: OWNER_SELECT },
      _count: { select: { viewers: true } },
    },
  })
  const expired = []
  for (const share of due) {
    const result = await prisma.liveLocationShare.updateMany({
      where: {
        id: share.id,
        status: LIVE_LOCATION_STATUSES.ACTIVE,
        expiresAt: { lte: now },
      },
      data: {
        status: LIVE_LOCATION_STATUSES.EXPIRED,
        endedAt: now,
        endedReason: 'expired',
        presenceStatus: LIVE_LOCATION_PRESENCE.PAUSED,
      },
    })
    if (result.count) {
      const value = {
        ...share,
        status: LIVE_LOCATION_STATUSES.EXPIRED,
        endedAt: now,
        endedReason: 'expired',
        presenceStatus: LIVE_LOCATION_PRESENCE.PAUSED,
      }
      expired.push(value)
      broadcastLiveLocationStatus(value)
      notifyLiveLocationEnded(value, { reason: 'expired' }).catch(() => {})
    }
  }
  return expired
}

export async function updateLiveLocationPoint(shareId, ownerId, point, now = new Date()) {
  const result = await prisma.liveLocationShare.updateMany({
    where: {
      id: shareId,
      ownerId,
      status: LIVE_LOCATION_STATUSES.ACTIVE,
      expiresAt: { gt: now },
    },
    data: {
      lastLatitude: point.latitude,
      lastLongitude: point.longitude,
      lastAccuracy: point.accuracy ?? null,
      lastSpeed: point.speed ?? null,
      lastHeading: point.heading ?? null,
      lastUpdatedAt: now,
      presenceStatus: LIVE_LOCATION_PRESENCE.ACTIVE,
    },
  })
  if (!result.count) return null
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy ?? null,
    speed: point.speed ?? null,
    heading: point.heading ?? null,
    updatedAt: now.toISOString(),
  }
}

export async function updateLiveLocationPresence(shareId, ownerId, status) {
  const now = new Date()
  const result = await prisma.liveLocationShare.updateMany({
    where: {
      id: shareId,
      ownerId,
      status: LIVE_LOCATION_STATUSES.ACTIVE,
      expiresAt: { gt: now },
    },
    data: { presenceStatus: status },
  })
  return result.count > 0
}
