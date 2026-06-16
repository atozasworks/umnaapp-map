import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'

export function useNotifications({ enabled = true, limit = 50 } = {}) {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return
    try {
      setError(null)
      const { data } = await api.get('/notifications', { params: { limit } })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount ?? 0)
      setNextCursor(data.nextCursor ?? null)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load notifications')
    }
  }, [enabled, limit])

  const loadMore = useCallback(async () => {
    if (!enabled || !nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const { data } = await api.get('/notifications', { params: { limit, cursor: nextCursor } })
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id))
        return [...prev, ...(data.notifications || []).filter((n) => !seen.has(n.id))]
      })
      setNextCursor(data.nextCursor ?? null)
    } catch {
      /* ignore pagination errors */
    } finally {
      setLoadingMore(false)
    }
  }, [enabled, limit, nextCursor, loadingMore])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchNotifications().finally(() => setLoading(false))
  }, [enabled, fetchNotifications])

  useEffect(() => {
    if (!socket || !enabled) return

    const onNew = (notification) => {
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.id !== notification.id)
        return [notification, ...filtered]
      })
      if (!notification.read) {
        setUnreadCount((c) => c + 1)
      }
    }

    const onUnreadCount = ({ count }) => {
      if (typeof count === 'number') setUnreadCount(count)
    }

    socket.on('notification:new', onNew)
    socket.on('notification:unread-count', onUnreadCount)
    return () => {
      socket.off('notification:new', onNew)
      socket.off('notification:unread-count', onUnreadCount)
    }
  }, [socket, enabled])

  const markRead = useCallback(async (id) => {
    const { data } = await api.patch(`/notifications/${id}/read`)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    if (typeof data.unreadCount === 'number') {
      setUnreadCount(data.unreadCount)
    } else {
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    return data.notification
  }, [])

  const markAllRead = useCallback(async () => {
    await api.post('/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  const remove = useCallback(async (id) => {
    const { data } = await api.delete(`/notifications/${id}`)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (typeof data?.unreadCount === 'number') {
      setUnreadCount(data.unreadCount)
    }
  }, [])

  const clearAll = useCallback(async () => {
    await api.delete('/notifications')
    setNotifications([])
    setUnreadCount(0)
    setNextCursor(null)
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    nextCursor,
    loadingMore,
    markRead,
    markAllRead,
    remove,
    clearAll,
    loadMore,
    refresh: fetchNotifications,
  }
}
