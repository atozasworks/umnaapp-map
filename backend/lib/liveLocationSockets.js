import prisma from '../config/database.js'
import {
  LIVE_LOCATION_PRESENCE,
  LIVE_LOCATION_STATUSES,
  broadcastLiveLocation,
  getLiveLocationParticipantShare,
  liveLocationRoom,
  updateLiveLocationPoint,
  updateLiveLocationPresence,
} from '../services/liveLocationService.js'
import { allowLiveLocationEmit, allowLiveLocationPersist } from '../utils/liveLocationRateLimit.js'

function parseCoordinate(value, min, max) {
  const num = Number(value)
  return Number.isFinite(num) && num >= min && num <= max ? num : null
}

function validatePoint(data) {
  const latitude = parseCoordinate(data?.latitude, -90, 90)
  const longitude = parseCoordinate(data?.longitude, -180, 180)
  if (latitude == null || longitude == null) return null
  const accuracy = data?.accuracy == null ? null : parseCoordinate(data.accuracy, 0, 100000)
  const speed = data?.speed == null ? null : parseCoordinate(data.speed, 0, 500)
  const heading = data?.heading == null ? null : parseCoordinate(data.heading, 0, 360)
  return { latitude, longitude, accuracy, speed, heading }
}

export function registerLiveLocationSockets(io, socket) {
  socket.on('live-location:join', async (data) => {
    const shareId = data?.shareId
    if (!shareId) return socket.emit('error', { message: 'Share ID required' })

    try {
      const share = await getLiveLocationParticipantShare(shareId, socket.userId)
      if (!share) {
        return socket.emit('error', { message: 'Live-location share not found or access denied' })
      }
      socket.join(liveLocationRoom(shareId))
      socket.emit('live-location:joined', { shareId })
    } catch (err) {
      console.error('live-location:join error', err)
      socket.emit('error', { message: 'Failed to join live-location room' })
    }
  })

  socket.on('live-location:leave', (data) => {
    const shareId = data?.shareId
    if (!shareId) return
    socket.leave(liveLocationRoom(shareId))
    socket.emit('live-location:left', { shareId })
  })

  socket.on('live-location:presence', async (data) => {
    const shareId = data?.shareId
    const status = data?.status === LIVE_LOCATION_PRESENCE.PAUSED
      ? LIVE_LOCATION_PRESENCE.PAUSED
      : LIVE_LOCATION_PRESENCE.ACTIVE
    if (!shareId) return

    try {
      const updated = await updateLiveLocationPresence(shareId, socket.userId, status)
      if (!updated) return
      broadcastLiveLocation(shareId, 'live-location:presence', { presenceStatus: status })
    } catch (err) {
      console.error('live-location:presence error', err)
    }
  })

  socket.on('live-location:update', async (data) => {
    const shareId = data?.shareId
    if (!shareId) return socket.emit('error', { message: 'Share ID required' })

    const point = validatePoint(data)
    if (!point) return socket.emit('error', { message: 'Invalid location data' })

    if (!allowLiveLocationEmit(shareId, socket.userId)) return

    try {
      const share = await prisma.liveLocationShare.findFirst({
        where: {
          id: shareId,
          ownerId: socket.userId,
          status: LIVE_LOCATION_STATUSES.ACTIVE,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, ownerId: true },
      })
      if (!share) {
        return socket.emit('error', { message: 'Live-location share not found or access denied' })
      }

      const payload = {
        shareId,
        ownerId: share.ownerId,
        location: {
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          speed: point.speed,
          heading: point.heading,
          updatedAt: new Date().toISOString(),
        },
      }

      broadcastLiveLocation(shareId, 'live-location:update', payload)

      if (allowLiveLocationPersist(shareId, socket.userId)) {
        await updateLiveLocationPoint(shareId, socket.userId, point)
      }
    } catch (err) {
      console.error('live-location:update error', err)
      socket.emit('error', { message: 'Failed to update live location' })
    }
  })
}

export async function pauseOwnerLiveSharesOnDisconnect(userId) {
  const activeShares = await prisma.liveLocationShare.findMany({
    where: {
      ownerId: userId,
      status: LIVE_LOCATION_STATUSES.ACTIVE,
      presenceStatus: LIVE_LOCATION_PRESENCE.ACTIVE,
    },
    select: { id: true },
  })

  for (const share of activeShares) {
    const updated = await updateLiveLocationPresence(share.id, userId, LIVE_LOCATION_PRESENCE.PAUSED)
    if (updated) {
      broadcastLiveLocation(share.id, 'live-location:presence', {
        presenceStatus: LIVE_LOCATION_PRESENCE.PAUSED,
      })
    }
  }
}
