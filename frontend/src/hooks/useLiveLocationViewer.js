import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import {
  getShareLocation,
  isLocationStale,
  isShareEnded,
} from '../utils/liveLocationShare'

export function useLiveLocationViewer({ shareId, initialShare, onEnded, onLocation }) {
  const { socket } = useSocket()
  const [share, setShare] = useState(initialShare || null)
  const [loading, setLoading] = useState(Boolean(shareId && !initialShare))
  const [error, setError] = useState('')
  const [stale, setStale] = useState(false)
  const shareRef = useRef(share)

  useEffect(() => {
    shareRef.current = share
  }, [share])

  const refreshShare = useCallback(async () => {
    if (!shareId) return null
    try {
      const { data } = await api.get(`/live-location/shares/${shareId}`)
      setShare(data.share)
      setError('')
      return data.share
    } catch (err) {
      setError(err.response?.data?.error || 'Live location unavailable')
      return null
    } finally {
      setLoading(false)
    }
  }, [shareId])

  useEffect(() => {
    if (!shareId) return
    if (!initialShare) refreshShare()
  }, [shareId, initialShare, refreshShare])

  useEffect(() => {
    if (!socket || !shareId) return undefined

    socket.emit('live-location:join', { shareId })

    const handleUpdate = (payload) => {
      if (payload?.shareId !== shareId || !payload?.location) return
      setShare((prev) => {
        const next = {
          ...(prev || {}),
          latestPoint: {
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
            accuracy: payload.location.accuracy,
            speed: payload.location.speed,
            heading: payload.location.heading,
            updatedAt: payload.location.updatedAt,
          },
          presenceStatus: 'active',
        }
        onLocation?.(getShareLocation(next))
        return next
      })
      setStale(false)
    }

    const handleStatus = (payload) => {
      if (payload?.shareId !== shareId) return
      setShare((prev) => ({
        ...(prev || {}),
        status: payload.status || prev?.status,
        presenceStatus: payload.presenceStatus || prev?.presenceStatus,
        endedAt: payload.endedAt || prev?.endedAt,
        endedReason: payload.reason || prev?.endedReason,
      }))
      if (payload.status && payload.status !== 'active') {
        onEnded?.(payload)
      }
    }

    const handlePresence = (payload) => {
      if (payload?.shareId !== shareId) return
      setShare((prev) => ({ ...(prev || {}), presenceStatus: payload.presenceStatus }))
    }

    socket.on('live-location:update', handleUpdate)
    socket.on('live-location:status', handleStatus)
    socket.on('live-location:presence', handlePresence)

    return () => {
      socket.emit('live-location:leave', { shareId })
      socket.off('live-location:update', handleUpdate)
      socket.off('live-location:status', handleStatus)
      socket.off('live-location:presence', handlePresence)
    }
  }, [socket, shareId, onEnded, onLocation])

  useEffect(() => {
    if (!share || isShareEnded(share)) return undefined
    const timer = setInterval(() => {
      setStale(isLocationStale(shareRef.current))
    }, 5000)
    return () => clearInterval(timer)
  }, [share])

  useEffect(() => {
    const location = getShareLocation(share)
    if (location) onLocation?.(location)
  }, [share, onLocation])

  return { share, loading, error, stale, refreshShare }
}

export async function exchangeLiveShareToken(token) {
  const { data } = await api.post('/live-location/exchange', { token })
  return data.share
}
