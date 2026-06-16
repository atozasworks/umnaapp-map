import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'

const ITINERARY_TYPES = ['itinerary_invite', 'itinerary_joined', 'itinerary_updated']

function formatTimeAgo(iso) {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function NotificationIcon({ type }) {
  const base = 'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0'
  if (type === 'place_approved') {
    return (
      <div className={`${base} bg-emerald-100 text-emerald-600`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </div>
    )
  }
  if (type === 'place_added') {
    return (
      <div className={`${base} bg-sky-100 text-sky-600`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </div>
    )
  }
  if (type === 'festival_today') {
    return <div className={`${base} bg-fuchsia-100 text-fuchsia-600 text-lg`} aria-hidden>🎪</div>
  }
  if (ITINERARY_TYPES.includes(type)) {
    return <div className={`${base} bg-indigo-100 text-indigo-600 text-lg`} aria-hidden>{type === 'itinerary_joined' ? '👥' : '🗺️'}</div>
  }
  return (
    <div className={`${base} bg-amber-100 text-amber-600`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </div>
  )
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const {
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
  } = useNotifications({ limit: 30 })

  const openNotification = useCallback(
    async (n) => {
      if (!n.read) markRead(n.id).catch(() => {})
      if (ITINERARY_TYPES.includes(n.type)) {
        const data = n.data || {}
        if (n.type === 'itinerary_invite' && data.shareToken) {
          navigate(`/home?joinTrip=${data.shareToken}`)
        } else if (data.itineraryId) {
          navigate(`/home?openTrip=${data.itineraryId}`)
        } else if (data.shareToken) {
          navigate(`/home?joinTrip=${data.shareToken}`)
        }
        return
      }
      if (n.data?.placeId || (n.data?.latitude != null && n.data?.longitude != null)) {
        navigate('/home', { state: { focusPlace: n.data } })
      }
    },
    [markRead, navigate]
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Notifications</h1>
            {unreadCount > 0 && <p className="text-xs text-slate-500">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead().catch(() => {})}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => { if (window.confirm('Delete all notifications?')) clearAll().catch(() => {}) }}
              className="text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-3 sm:px-4 py-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-2 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">{error}</div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <p className="text-base font-medium text-slate-700">No notifications</p>
            <p className="text-sm text-slate-500 mt-1">Trip invites, place updates and approvals will appear here.</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const isInvite = n.type === 'itinerary_invite'
              return (
                <li
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`group flex gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                    !n.read ? 'bg-primary-50/50 border-primary-100' : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <NotificationIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{n.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 mt-1.5" aria-hidden />}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); remove(n.id).catch(() => {}) }}
                          className="p-1 -mr-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Delete notification"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{n.body}</p>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <p className="text-xs text-slate-400">{formatTimeAgo(n.createdAt)}</p>
                      {isInvite && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openNotification(n) }}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Join trip
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && !error && nextCursor && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => loadMore()}
              disabled={loadingMore}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load older'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
