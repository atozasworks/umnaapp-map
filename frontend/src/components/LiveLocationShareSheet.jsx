import { useState } from 'react'
import {
  LIVE_SHARE_DURATIONS,
  buildLiveShareUrl,
  formatCountdown,
  getRemainingSeconds,
} from '../utils/liveLocationShare'
import { startLiveLocationShare } from '../hooks/useLiveLocationShare'

const LiveLocationShareSheet = ({
  isOpen,
  onClose,
  onStarted,
  onError,
  activeShare,
  shareUrl,
  onStop,
  presenceStatus,
}) => {
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const remaining = activeShare ? getRemainingSeconds(activeShare.expiresAt) : 0

  const handleStart = async () => {
    setStarting(true)
    try {
      const data = await startLiveLocationShare(durationMinutes)
      onStarted?.(data)
    } catch (err) {
      onError?.(err.response?.data?.error || err.message || 'Could not start live sharing')
    } finally {
      setStarting(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onError?.('Could not copy link')
    }
  }

  const handleNativeShare = async () => {
    if (!shareUrl || !navigator.share) return handleCopy()
    try {
      await navigator.share({
        title: 'UMNAAPP live location',
        text: 'Follow my live location on UMNAAPP',
        url: shareUrl,
      })
    } catch {
      /* user cancelled */
    }
  }

  const handleStop = async () => {
    if (!onStop) return
    setStopping(true)
    try {
      await onStop()
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[360] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Share live location</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {activeShare?.status === 'active' ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-sm font-semibold text-emerald-800">You are sharing live location</p>
              <p className="text-xs text-emerald-700 mt-1">
                Ends in {formatCountdown(remaining)} ·{' '}
                {presenceStatus === 'paused' ? 'Paused (app in background)' : 'Updating live'}
              </p>
              {activeShare.viewerCount != null && (
                <p className="text-xs text-emerald-700 mt-1">{activeShare.viewerCount} viewer(s)</p>
              )}
            </div>

            {shareUrl && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 break-all">{shareUrl}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700"
                  >
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex-1 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-sm font-medium text-white"
                  >
                    Share link
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleStop}
              disabled={stopping}
              className="w-full px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold"
            >
              {stopping ? 'Stopping…' : 'Stop sharing'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Anyone with the link can view your live location after they sign in. Only your latest position is stored.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LIVE_SHARE_DURATIONS.map((item) => (
                <button
                  key={item.minutes}
                  type="button"
                  onClick={() => setDurationMinutes(item.minutes)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    durationMinutes === item.minutes
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="w-full px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold"
            >
              {starting ? 'Starting…' : 'Start sharing'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveLocationShareSheet
