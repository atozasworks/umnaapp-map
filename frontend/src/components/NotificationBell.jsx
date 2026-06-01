import { useCallback, useEffect, useRef, useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'

function formatTimeAgo(iso) {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function NotificationIcon({ type }) {
  const base = 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0'
  if (type === 'place_approved') {
    return (
      <div className={`${base} bg-emerald-100 text-emerald-600`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  if (type === 'place_added') {
    return (
      <div className={`${base} bg-sky-100 text-sky-600`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    )
  }
  return (
    <div className={`${base} bg-amber-100 text-amber-600`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  )
}

export default function NotificationBell({ onPlaceFocus }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleItemClick = useCallback(
    async (notification) => {
      if (!notification.read) {
        try {
          await markRead(notification.id)
        } catch {
          /* ignore */
        }
      }
      const placeId = notification.data?.placeId
      if (placeId && onPlaceFocus) {
        onPlaceFocus(notification.data)
        setOpen(false)
      }
    },
    [markRead, onPlaceFocus]
  )

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 sm:p-2 rounded-xl hover:bg-white/60 active:bg-white/80 transition-colors text-slate-600 flex items-center justify-center min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 sm:top-0.5 sm:right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-sm ring-2 ring-white">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[35] bg-black/20 sm:bg-transparent sm:pointer-events-none"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+3.25rem)] z-[36] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(100vw-1.5rem,22rem)] sm:max-h-[min(70vh,32rem)] flex flex-col glass rounded-2xl border border-white/50 shadow-2xl overflow-hidden animate-slide-up"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/40 bg-white/40">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-500">{unreadCount} unread</p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead().catch(() => {})}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 max-h-[min(50vh,20rem)] sm:max-h-[min(60vh,24rem)]">
              {loading && (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                        <div className="h-2 bg-slate-100 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && error && (
                <p className="p-4 text-sm text-red-600 text-center">{error}</p>
              )}

              {!loading && !error && notifications.length === 0 && (
                <div className="py-12 px-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">No notifications yet</p>
                  <p className="text-xs text-slate-500 mt-1">Place updates and approvals will appear here.</p>
                </div>
              )}

              {!loading && !error && notifications.length > 0 && (
                <ul className="divide-y divide-white/30">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className={`w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-white/50 ${
                          !n.read ? 'bg-primary-50/40' : ''
                        }`}
                      >
                        <NotificationIcon type={n.type} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm truncate ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" aria-hidden />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
