import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { getCurrentPositionAsync } from '../utils/geolocation'
import {
  clearStoredLiveShareToken,
  getStoredLiveShareToken,
  storeLiveShareToken,
} from '../utils/liveLocationShare'

const EMIT_INTERVAL_MS = 1000

export function useLiveLocationShare({ share, onShareEnded, onError }) {
  const { socket } = useSocket()
  const [presenceStatus, setPresenceStatus] = useState(share?.presenceStatus || 'active')
  const watchIdRef = useRef(null)
  const lastEmitRef = useRef(0)
  const wakeLockRef = useRef(null)
  const shareId = share?.id
  const isActive = share?.status === 'active'

  const emitPresence = useCallback(
    (status) => {
      if (!socket || !shareId) return
      socket.emit('live-location:presence', { shareId, status })
      setPresenceStatus(status)
    },
    [socket, shareId]
  )

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const emitUpdate = useCallback(
    (coords) => {
      if (!socket || !shareId || !isActive) return
      const now = Date.now()
      if (now - lastEmitRef.current < EMIT_INTERVAL_MS) return
      lastEmitRef.current = now
      socket.emit('live-location:update', {
        shareId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed,
        heading: coords.heading,
      })
    },
    [socket, shareId, isActive]
  )

  const startWatch = useCallback(() => {
    if (!isActive || !navigator.geolocation) return
    stopWatch()
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        emitPresence('active')
        emitUpdate(position.coords)
      },
      (error) => {
        onError?.(error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    )
  }, [isActive, stopWatch, emitPresence, emitUpdate, onError])

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release?.().catch(() => {})
    wakeLockRef.current = null
  }, [])

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        const lock = await navigator.wakeLock.request('screen')
        wakeLockRef.current = lock
        lock.addEventListener?.('release', () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null
        })
      }
    } catch {
      /* unsupported / denied */
    }
  }, [])

  useEffect(() => {
    if (!socket || !shareId || !isActive) return undefined

    socket.emit('live-location:join', { shareId })

    const handleStatus = (payload) => {
      if (payload?.shareId !== shareId) return
      if (payload.status && payload.status !== 'active') {
        onShareEnded?.(payload)
      }
      if (payload.presenceStatus) setPresenceStatus(payload.presenceStatus)
    }

    const handlePresence = (payload) => {
      if (payload?.shareId !== shareId) return
      if (payload.presenceStatus) setPresenceStatus(payload.presenceStatus)
    }

    socket.on('live-location:status', handleStatus)
    socket.on('live-location:presence', handlePresence)

    return () => {
      socket.emit('live-location:leave', { shareId })
      socket.off('live-location:status', handleStatus)
      socket.off('live-location:presence', handlePresence)
    }
  }, [socket, shareId, isActive, onShareEnded])

  useEffect(() => {
    if (!isActive) {
      stopWatch()
      releaseWakeLock()
      return undefined
    }

    startWatch()
    requestWakeLock()

    return () => {
      stopWatch()
      releaseWakeLock()
    }
  }, [isActive, startWatch, stopWatch, requestWakeLock, releaseWakeLock])

  useEffect(() => {
    if (!isActive) return undefined

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        emitPresence('paused')
        stopWatch()
        releaseWakeLock()
      } else {
        emitPresence('active')
        startWatch()
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isActive, emitPresence, stopWatch, startWatch, requestWakeLock, releaseWakeLock])

  const stopSharing = useCallback(async () => {
    stopWatch()
    releaseWakeLock()
    if (!shareId) return null
    const { data } = await api.post(`/live-location/shares/${shareId}/stop`)
    clearStoredLiveShareToken(shareId)
    onShareEnded?.({ shareId, status: 'stopped', reason: 'manual' })
    return data.share
  }, [shareId, stopWatch, releaseWakeLock, onShareEnded])

  return { presenceStatus, stopSharing }
}

export async function startLiveLocationShare(durationMinutes) {
  await getCurrentPositionAsync({ timeout: 12000 })
  const { data } = await api.post('/live-location/shares', { durationMinutes })
  if (data?.share?.id && data?.token) {
    storeLiveShareToken(data.share.id, data.token)
  }
  return data
}

export async function fetchActiveOwnedLiveShare() {
  const { data } = await api.get('/live-location/shares/active')
  return data.share || null
}

export async function restoreLiveShareToken(shareId) {
  const stored = getStoredLiveShareToken(shareId)
  if (stored) return stored
  const { data } = await api.post(`/live-location/shares/${shareId}/rotate-token`)
  if (data?.token) storeLiveShareToken(shareId, data.token)
  return data?.token || ''
}

export async function stopLiveLocationShareById(shareId) {
  const { data } = await api.post(`/live-location/shares/${shareId}/stop`)
  clearStoredLiveShareToken(shareId)
  return data.share
}
