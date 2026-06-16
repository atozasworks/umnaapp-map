import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { formatPlaceAddressLine } from '../utils/placeDisplay'
import { festivalStatus, festivalCountdownLabel, formatFestivalWindow } from '../utils/festival'

/**
 * Festivals & Jatres panel — time-bound markers surfaced as an upcoming list
 * with countdowns. Festival markers are hidden on the map outside their window,
 * so this panel is the primary way pilgrims/travellers discover and plan around
 * them ahead of time.
 */
export default function UpcomingFestivalsPanel({ onClose, onPlaceSelect, onAddFestival }) {
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/map/festivals/upcoming')
      setFestivals(Array.isArray(data.festivals) ? data.festivals : [])
    } catch (err) {
      if (err.response?.status === 503) {
        setError('Festivals are not available yet. Run the migration: add-place-festival.sql, then `npx prisma generate` and restart the server.')
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load festivals')
      }
      setFestivals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="absolute inset-0 z-[46] flex pointer-events-none" style={{ top: 0 }}>
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto sm:hidden"
        onClick={onClose}
      />
      <div
        className="relative pointer-events-auto w-full max-w-[min(100vw,24rem)] sm:max-w-sm h-full bg-white shadow-2xl flex flex-col animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        style={{ marginTop: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-gradient-to-r from-fuchsia-50 to-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl leading-none" aria-hidden>🎪</span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-800 leading-tight">Festivals &amp; Jatres</h2>
              <p className="text-xs text-slate-500 leading-tight">Upcoming events near you, with countdowns</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onAddFestival && (
              <button
                type="button"
                onClick={onAddFestival}
                className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/70 text-slate-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
              <span className="text-sm">Loading festivals…</span>
            </div>
          )}

          {!loading && error && (
            <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
              <button onClick={load} className="block mt-2 text-xs font-medium text-red-700 underline">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && festivals.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center text-slate-500">
              <span className="text-3xl" aria-hidden>🗓️</span>
              <p className="text-sm font-medium text-slate-600">No upcoming festivals yet</p>
              <p className="text-xs text-slate-400">
                Tap <span className="font-medium text-fuchsia-600">+ Add</span> above to put a
                festival or jatre on the map with its dates.
              </p>
              {onAddFestival && (
                <button
                  type="button"
                  onClick={onAddFestival}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add a festival
                </button>
              )}
            </div>
          )}

          {!loading && !error && festivals.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {festivals.map((f) => {
                const status = f.festival || festivalStatus(f)
                const name = f.place_name_local || f.place_name_en || f.name || 'Festival'
                const address = formatPlaceAddressLine(f)
                const countdown = festivalCountdownLabel(status)
                const windowText = formatFestivalWindow(status)
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onPlaceSelect && onPlaceSelect(f)}
                      className="w-full text-left px-4 py-3.5 hover:bg-fuchsia-50/60 active:bg-fuchsia-100/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-lg leading-none flex-shrink-0" aria-hidden>🎪</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800 truncate">{name}</span>
                            {status?.active ? (
                              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                Live now
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700">
                                {countdown}
                              </span>
                            )}
                          </div>
                          {windowText && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {windowText}
                              {status?.recurrence === 'yearly' && (
                                <span className="text-slate-400"> · yearly</span>
                              )}
                            </p>
                          )}
                          {address && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{address}</p>
                          )}
                          {status?.active && (
                            <p className="text-xs font-medium text-green-600 mt-0.5">{countdown}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
