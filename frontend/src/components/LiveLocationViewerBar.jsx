import {
  formatCountdown,
  formatRelativeAge,
  getRemainingSeconds,
  getShareLocation,
  isShareEnded,
} from '../utils/liveLocationShare'

const LiveLocationViewerBar = ({
  share,
  stale,
  followEnabled,
  onRecenter,
  onToggleFollow,
  onDirections,
  onStopViewing,
}) => {
  if (!share) return null

  const location = getShareLocation(share)
  const ownerName = share.owner?.name || 'Someone'
  const ended = isShareEnded(share)
  const remaining = getRemainingSeconds(share.expiresAt)
  const paused = share.presenceStatus === 'paused'

  return (
    <div className="absolute bottom-4 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[55]">
      <div className="glass rounded-2xl shadow-xl border border-white/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {ended ? `${ownerName} stopped sharing` : `${ownerName} is sharing live location`}
            </p>
            {!ended && (
              <p className="text-xs text-slate-500 mt-1">
                Ends in {formatCountdown(remaining)}
                {location?.updatedAt ? ` · Updated ${formatRelativeAge(location.updatedAt)}` : ' · Waiting for location'}
              </p>
            )}
            {!ended && (paused || stale) && (
              <p className="text-xs text-amber-700 mt-1">
                {paused ? 'Sender paused updates (app in background)' : 'Location may be stale'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onStopViewing}
            className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            aria-label="Stop viewing"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!ended && location && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRecenter}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Recenter
            </button>
            <button
              type="button"
              onClick={onToggleFollow}
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                followEnabled
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {followEnabled ? 'Following' : 'Follow'}
            </button>
            <button
              type="button"
              onClick={onDirections}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Directions
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveLocationViewerBar
