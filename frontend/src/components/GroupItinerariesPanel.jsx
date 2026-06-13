import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

/**
 * Co-Edited Group Itineraries — list + create + join.
 *
 * Slide-in left panel (mirrors UpcomingFestivalsPanel) that lists the trips the
 * user owns or collaborates on. From here they create a new trip, open one to
 * co-edit, or join a trip from a shared invite link/token. Opening a trip hands
 * off to ItineraryDetailPanel via onOpenItinerary(id).
 */
export default function GroupItinerariesPanel({ onClose, onOpenItinerary, initialJoinToken }) {
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('list') // list | create | join
  const [submitting, setSubmitting] = useState(false)

  // create form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🗺️')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // join form
  const [joinValue, setJoinValue] = useState('')
  const [joinError, setJoinError] = useState(null)

  // Trips can't start in the past — clamp date pickers to today onwards.
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/itineraries')
      setItineraries(Array.isArray(data.itineraries) ? data.itineraries : [])
    } catch (err) {
      if (err.response?.status === 503) {
        setError('Group itineraries are not available yet. Apply the migration backend/prisma/add-itineraries.sql, run `npx prisma generate`, and restart the server.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load itineraries')
      }
      setItineraries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Auto-join when arriving via a share link (?joinTrip=<token>).
  const joinByToken = useCallback(
    async (rawToken) => {
      const token = extractToken(rawToken)
      if (!token) {
        setJoinError('Paste a valid invite link or code.')
        return
      }
      setSubmitting(true)
      setJoinError(null)
      try {
        const { data } = await api.post(`/itineraries/share/${encodeURIComponent(token)}/join`)
        if (data.itinerary?.id) {
          onOpenItinerary(data.itinerary.id)
        }
      } catch (err) {
        setJoinError(err.response?.data?.error || err.message || 'Could not join this trip')
      } finally {
        setSubmitting(false)
      }
    },
    [onOpenItinerary]
  )

  useEffect(() => {
    if (initialJoinToken) {
      joinByToken(initialJoinToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJoinToken])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim() || submitting) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/itineraries', {
        title: title.trim(),
        description: description.trim() || undefined,
        coverEmoji: emoji || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      })
      if (data.itinerary?.id) {
        onOpenItinerary(data.itinerary.id)
      } else {
        await load()
        setMode('list')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create trip')
    } finally {
      setSubmitting(false)
    }
  }

  const EMOJI_CHOICES = ['🗺️', '🏖️', '⛰️', '🏛️', '🛕', '🌴', '🍽️', '🎒', '🚗', '✈️']

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
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl leading-none" aria-hidden>🧭</span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-800 leading-tight">Group Trips</h2>
              <p className="text-xs text-slate-500 leading-tight">Plan together · vote · build a route</p>
            </div>
          </div>
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

        {/* Action bar */}
        {mode === 'list' && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setMode('create')}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New trip
            </button>
            <button
              type="button"
              onClick={() => { setMode('join'); setJoinError(null); setJoinValue('') }}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5" />
              </svg>
              Join via link
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Create form */}
          {mode === 'create' && (
            <form onSubmit={handleCreate} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trip name</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Weekend in Coorg"
                  maxLength={120}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_CHOICES.map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setEmoji(em)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${emoji === em ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="text-slate-400">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="What's the plan?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    min={todayStr}
                    onChange={(e) => {
                      const next = e.target.value
                      setStartDate(next)
                      // Keep end date valid relative to the new start date.
                      if (endDate && next && endDate < next) setEndDate(next)
                    }}
                    className="w-full px-2 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End</label>
                  <input type="date" value={endDate} min={startDate || todayStr} onChange={(e) => setEndDate(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={!title.trim() || submitting} className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {submitting ? 'Creating…' : 'Create trip'}
                </button>
                <button type="button" onClick={() => setMode('list')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Join form */}
          {mode === 'join' && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-600">Paste an invite link or code to join a friend's trip.</p>
              <input
                autoFocus
                type="text"
                value={joinValue}
                onChange={(e) => setJoinValue(e.target.value)}
                placeholder="https://…/home?joinTrip=abc123"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {joinError && <p className="text-xs text-red-600">{joinError}</p>}
              <div className="flex items-center gap-2">
                <button type="button" disabled={submitting || !joinValue.trim()} onClick={() => joinByToken(joinValue)} className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {submitting ? 'Joining…' : 'Join trip'}
                </button>
                <button type="button" onClick={() => setMode('list')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {mode === 'list' && (
            <>
              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                  <span className="text-sm">Loading your trips…</span>
                </div>
              )}

              {!loading && error && (
                <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                  <button onClick={load} className="block mt-2 text-xs font-medium text-red-700 underline">Try again</button>
                </div>
              )}

              {!loading && !error && itineraries.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center text-slate-500">
                  <span className="text-3xl" aria-hidden>🧳</span>
                  <p className="text-sm font-medium text-slate-600">No trips yet</p>
                  <p className="text-xs text-slate-400">Start a collaborative trip and invite friends to plan together — add places, vote, and build a route as a group.</p>
                  <button type="button" onClick={() => setMode('create')} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create a trip
                  </button>
                </div>
              )}

              {!loading && !error && itineraries.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {itineraries.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => onOpenItinerary(it.id)}
                        className="w-full text-left px-4 py-3.5 hover:bg-indigo-50/60 active:bg-indigo-100/60 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-xl leading-none flex-shrink-0" aria-hidden>{it.coverEmoji || '🗺️'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800 truncate">{it.title}</span>
                              {it.myRole === 'owner' && (
                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Owner</span>
                              )}
                              {it.myRole === 'viewer' && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">View only</span>
                              )}
                            </div>
                            {it.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{it.description}</p>}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {it.stopCount} {it.stopCount === 1 ? 'stop' : 'stops'} · {it.memberCount} {it.memberCount === 1 ? 'member' : 'members'}
                              {formatDateRange(it.startDate, it.endDate) ? ` · ${formatDateRange(it.startDate, it.endDate)}` : ''}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function extractToken(raw) {
  if (!raw) return ''
  const value = String(raw).trim()
  // Accept a full URL (?joinTrip=token) or a bare token.
  const match = value.match(/[?&]joinTrip=([^&\s]+)/)
  if (match) return decodeURIComponent(match[1])
  // Last path segment fallback, else the raw value.
  if (value.includes('/')) {
    const seg = value.split(/[?#]/)[0].split('/').filter(Boolean).pop()
    if (seg) return seg
  }
  return value
}

function formatDateRange(start, end) {
  if (!start && !end) return ''
  const opts = { month: 'short', day: 'numeric' }
  try {
    if (start && end) {
      const s = new Date(start).toLocaleDateString(undefined, opts)
      const e = new Date(end).toLocaleDateString(undefined, opts)
      return `${s} – ${e}`
    }
    const only = new Date(start || end).toLocaleDateString(undefined, opts)
    return only
  } catch {
    return ''
  }
}
