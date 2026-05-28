import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'

export function useNotifications({ enabled = true } = {}) {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return
    try {
      setError(null)
      const { data } = await api.get('/notifications', { params: { limit: 50 } })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load notifications')
    }
  }, [enabled])

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

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  }
}
