import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { isElectron } from '../platform/runtime'

function PwaOfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white text-center text-sm font-medium py-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-md"
      role="status"
      aria-live="polite"
    >
      You are offline. Cached pages work; maps and live data need a connection.
    </div>
  )
}

function PwaUpdateBanner({ needRefresh, onUpdate, onDismiss }) {
  if (!needRefresh) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[9998] glass rounded-2xl p-4 shadow-2xl border border-primary-200 animate-slide-up pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-labelledby="pwa-update-title"
    >
      <p id="pwa-update-title" className="text-sm font-semibold text-slate-800 mb-1">
        Update available
      </p>
      <p className="text-xs text-slate-600 mb-3">
        A new version of UMNAAPP is ready. Refresh to get the latest features.
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1 py-2 text-sm" onClick={onUpdate}>
          Refresh
        </button>
        <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  )
}

/** Registers the service worker and shows offline / update UI. */
export default function PwaShell({ children }) {
  const updateSWRef = useRef(() => {})
  const [needRefresh, setNeedRefresh] = useState(false)

  useEffect(() => {
    // Desktop (Electron) loads from file:// — no service worker. Web & Capacitor
    // keep the exact same registration as before.
    if (isElectron()) return
    updateSWRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
    })
  }, [])

  const handleUpdate = () => {
    updateSWRef.current?.(true)
    setNeedRefresh(false)
  }

  return (
    <>
      {children}
      <PwaOfflineBanner />
      <PwaUpdateBanner
        needRefresh={needRefresh}
        onUpdate={handleUpdate}
        onDismiss={() => setNeedRefresh(false)}
      />
    </>
  )
}
