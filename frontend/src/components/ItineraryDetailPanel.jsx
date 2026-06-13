import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'

/**
 * Co-Edited Group Itinerary — detail / co-editing view.
 *
 * Real-time: joins the `itinerary:<id>` socket room and re-fetches whenever any
 * member changes the trip (stops, votes, comments, members). All mutation
 * endpoints return the full itinerary, so we update local state from responses
 * for the acting user and rely on the socket re-fetch for everyone else.
 *
 * Voting: each member likes/dislikes a stop. When the owner turns on "auto
 * order", the backend re-sorts stops by net votes; otherwise members reorder
 * manually with the up/down arrows.
 */
export default function ItineraryDetailPanel({ itineraryId, currentUser, onClose, onBack, onShowOnMap }) {
  const { socket } = useSocket()
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [expandedStopId, setExpandedStopId] = useState(null)
  const refetchTimer = useRef(null)

  const userId = currentUser?.id
  const myRole = itinerary?.myRole
  const canEdit = myRole === 'owner' || myRole === 'editor'
  const isOwner = myRole === 'owner'

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/itineraries/${itineraryId}`)
      setItinerary(data.itinerary)
      setError(null)
    } catch (err) {
      if (err.response?.status === 503) {
        setError('Group itineraries are not available yet. Apply the migration and restart the server.')
      } else if (err.response?.status === 403) {
        setError('You no longer have access to this trip.')
      } else if (err.response?.status === 404) {
        setError('This trip no longer exists.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load trip')
      }
    } finally {
      setLoading(false)
    }
  }, [itineraryId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Real-time: join the trip room and re-fetch on any broadcast update.
  useEffect(() => {
    if (!socket || !itineraryId) return
    socket.emit('itinerary:join', { itineraryId })
    const onUpdate = (payload) => {
      if (payload?.itineraryId !== itineraryId) return
      if (payload.event === 'itinerary:deleted') {
        setError('This trip was deleted by the owner.')
        setItinerary(null)
        return
      }
      // Debounce bursts of updates into a single refetch.
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      refetchTimer.current = setTimeout(() => load(), 250)
    }
    socket.on('itinerary:update', onUpdate)
    return () => {
      socket.emit('itinerary:leave', { itineraryId })
      socket.off('itinerary:update', onUpdate)
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
    }
  }, [socket, itineraryId, load])

  const applyResponse = (data) => {
    if (data?.itinerary) setItinerary(data.itinerary)
  }

  const runAction = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong')
      setTimeout(() => setError(null), 4000)
    } finally {
      setBusy(false)
    }
  }

  const handleVote = (stop, value) => {
    const next = stop.votes.myVote === value ? 0 : value
    runAction(async () => {
      const { data } = await api.post(`/itineraries/${itineraryId}/stops/${stop.id}/vote`, { value: next })
      applyResponse(data)
    })
  }

  const handleRemoveStop = (stop) => {
    runAction(async () => {
      const { data } = await api.delete(`/itineraries/${itineraryId}/stops/${stop.id}`)
      applyResponse(data)
    })
  }

  const handleMoveStop = (index, dir) => {
    const stops = itinerary?.stops || []
    const target = index + dir
    if (target < 0 || target >= stops.length) return
    const order = stops.map((s) => s.id)
    const [moved] = order.splice(index, 1)
    order.splice(target, 0, moved)
    runAction(async () => {
      const { data } = await api.post(`/itineraries/${itineraryId}/stops/reorder`, { order })
      applyResponse(data)
    })
  }

  const handleAddStop = (place) => {
    runAction(async () => {
      const { data } = await api.post(`/itineraries/${itineraryId}/stops`, {
        name: place.name,
        latitude: place.lat,
        longitude: place.lng,
        category: place.category || null,
        address: place.address || null,
        placeId: place.placeId || null,
      })
      applyResponse(data)
    })
  }

  const handleToggleAutoSort = () => {
    runAction(async () => {
      const { data } = await api.patch(`/itineraries/${itineraryId}`, { autoSort: !itinerary.autoSort })
      applyResponse(data)
    })
  }

  const handleDelete = () => {
    runAction(async () => {
      await api.delete(`/itineraries/${itineraryId}`)
      onBack?.()
    })
  }

  const handleLeave = () => {
    runAction(async () => {
      await api.post(`/itineraries/${itineraryId}/leave`)
      onBack?.()
    })
  }

  const shareLink = itinerary?.shareToken
    ? `${window.location.origin}/home?joinTrip=${itinerary.shareToken}`
    : ''

  const handleCopyShare = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      /* clipboard blocked; surface the link instead */
      window.prompt('Copy this invite link:', shareLink)
    }
  }

  const showOnMap = () => {
    const stops = (itinerary?.stops || []).filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
    if (stops.length === 0) return
    onShowOnMap?.(stops, itinerary)
  }

  return (
    <div className="absolute inset-0 z-[46] flex pointer-events-none" style={{ top: 0 }}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto sm:hidden" onClick={onClose} />
      <div
        className="relative pointer-events-auto w-full max-w-[min(100vw,26rem)] sm:max-w-md h-full bg-white shadow-2xl flex flex-col animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        style={{ marginTop: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/70 text-slate-600" aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xl leading-none flex-shrink-0" aria-hidden>{itinerary?.coverEmoji || '🗺️'}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800 leading-tight truncate">{itinerary?.title || 'Trip'}</h2>
            <p className="text-xs text-slate-500 leading-tight">
              {itinerary ? `${itinerary.stopCount} stops · ${itinerary.memberCount} members` : 'Loading…'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/70 text-slate-600" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        {itinerary && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 overflow-x-auto">
            <button type="button" onClick={showOnMap} disabled={!itinerary.stops?.length} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Show route
            </button>
            <button type="button" onClick={handleCopyShare} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {shareCopied ? 'Link copied!' : 'Share'}
            </button>
            <button type="button" onClick={() => setShowMembers((v) => !v)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
              </svg>
              Members
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              <span className="text-sm">Loading trip…</span>
            </div>
          )}

          {!loading && error && !itinerary && (
            <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
              <button onClick={onBack} className="block mt-2 text-xs font-medium text-red-700 underline">Back to trips</button>
            </div>
          )}

          {itinerary && (
            <>
              {error && (
                <div className="m-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
              )}

              {showMembers && (
                <MembersSection
                  itinerary={itinerary}
                  isOwner={isOwner}
                  currentUserId={userId}
                  onChanged={applyResponse}
                  onError={(m) => { setError(m); setTimeout(() => setError(null), 4000) }}
                />
              )}

              {/* Auto-order toggle (owner) */}
              {isOwner && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">Auto-order by votes</p>
                    <p className="text-xs text-slate-400">Most-liked stops rise to the top automatically</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoSort}
                    disabled={busy}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${itinerary.autoSort ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    aria-pressed={itinerary.autoSort}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${itinerary.autoSort ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Add stop */}
              {canEdit && <AddStopSearch onAdd={handleAddStop} busy={busy} />}

              {/* Stops */}
              {itinerary.stops?.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center text-slate-500">
                  <span className="text-3xl" aria-hidden>📍</span>
                  <p className="text-sm font-medium text-slate-600">No stops yet</p>
                  <p className="text-xs text-slate-400">{canEdit ? 'Search above to add the first place to this trip.' : 'The trip organisers haven’t added places yet.'}</p>
                </div>
              )}

              <ul className="divide-y divide-slate-100">
                {(itinerary.stops || []).map((stop, index) => (
                  <StopCard
                    key={stop.id}
                    stop={stop}
                    index={index}
                    total={itinerary.stops.length}
                    canEdit={canEdit}
                    autoSort={itinerary.autoSort}
                    busy={busy}
                    expanded={expandedStopId === stop.id}
                    onToggleExpand={() => setExpandedStopId(expandedStopId === stop.id ? null : stop.id)}
                    onVote={handleVote}
                    onRemove={handleRemoveStop}
                    onMove={handleMoveStop}
                    itineraryId={itineraryId}
                    currentUser={currentUser}
                    onCommentChange={load}
                  />
                ))}
              </ul>

              {/* Footer: leave (non-owner) / delete (owner) */}
              <div className="px-4 py-4 border-t border-slate-100 mt-2">
                {isOwner ? (
                  <button type="button" onClick={handleDelete} disabled={busy} className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                    Delete this trip
                  </button>
                ) : (
                  <button type="button" onClick={handleLeave} disabled={busy} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    Leave this trip
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stop card: name, vote buttons, reorder, remove, comments toggle.
// ---------------------------------------------------------------------------
function StopCard({ stop, index, total, canEdit, autoSort, busy, expanded, onToggleExpand, onVote, onRemove, onMove, itineraryId, currentUser, onCommentChange }) {
  const v = stop.votes || { likes: 0, dislikes: 0, score: 0, myVote: 0 }
  return (
    <li className="px-3 py-3">
      <div className="flex items-start gap-2.5">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
          {canEdit && !autoSort && (
            <div className="flex flex-col">
              <button type="button" onClick={() => onMove(index, -1)} disabled={busy || index === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30" aria-label="Move up">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
              <button type="button" onClick={() => onMove(index, 1)} disabled={busy || index === total - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30" aria-label="Move down">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{stop.name}</p>
              {stop.category && <p className="text-xs text-indigo-600 mt-0.5">{stop.category}</p>}
              {stop.address && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{stop.address}</p>}
              {stop.addedByName && <p className="text-[11px] text-slate-300 mt-0.5">added by {stop.addedByName}</p>}
            </div>
            {canEdit && (
              <button type="button" onClick={() => onRemove(stop)} disabled={busy} className="text-slate-300 hover:text-red-500 disabled:opacity-40 flex-shrink-0" aria-label="Remove stop">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>

          {/* Vote + comment row */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => onVote(stop, 1)}
              disabled={busy}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors ${v.myVote === 1 ? 'bg-green-600 border-green-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-green-50'}`}
            >
              <svg className="w-3.5 h-3.5" fill={v.myVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
              {v.likes}
            </button>
            <button
              type="button"
              onClick={() => onVote(stop, -1)}
              disabled={busy}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors ${v.myVote === -1 ? 'bg-red-600 border-red-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-red-50'}`}
            >
              <svg className="w-3.5 h-3.5" fill={v.myVote === -1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.737 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
              {v.dislikes}
            </button>
            <span className={`text-xs font-semibold ${v.score > 0 ? 'text-green-600' : v.score < 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {v.score > 0 ? `+${v.score}` : v.score}
            </span>
            <button type="button" onClick={onToggleExpand} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {stop.commentCount > 0 ? stop.commentCount : ''} {expanded ? 'Hide' : 'Discuss'}
            </button>
          </div>

          {expanded && (
            <CommentsSection
              itineraryId={itineraryId}
              stop={stop}
              currentUser={currentUser}
              onCommentChange={onCommentChange}
            />
          )}
        </div>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Comments for a stop (lazy-loaded when expanded).
// ---------------------------------------------------------------------------
function CommentsSection({ itineraryId, stop, currentUser, onCommentChange }) {
  const [comments, setComments] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/itineraries/${itineraryId}/stops/${stop.id}/comments`)
      setComments(Array.isArray(data.comments) ? data.comments : [])
    } catch {
      setComments([])
    }
  }, [itineraryId, stop.id])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const { data } = await api.post(`/itineraries/${itineraryId}/stops/${stop.id}/comments`, { body: text.trim() })
      setComments((prev) => [...(prev || []), data.comment])
      setText('')
      onCommentChange?.()
    } catch {
      /* ignore */
    } finally {
      setSending(false)
    }
  }

  const remove = async (commentId) => {
    try {
      await api.delete(`/itineraries/${itineraryId}/stops/${stop.id}/comments/${commentId}`)
      setComments((prev) => (prev || []).filter((c) => c.id !== commentId))
      onCommentChange?.()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-2 pl-1 border-l-2 border-indigo-100">
      <div className="space-y-2 pl-2">
        {comments === null && <p className="text-xs text-slate-400">Loading comments…</p>}
        {comments?.length === 0 && <p className="text-xs text-slate-400">No comments yet. Start the discussion!</p>}
        {comments?.map((c) => (
          <div key={c.id} className="group">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-slate-700">{c.userName || 'Member'}</span>
              <span className="text-[10px] text-slate-300">{formatTime(c.createdAt)}</span>
              {c.userId === currentUser?.id && (
                <button type="button" onClick={() => remove(c.id)} className="ml-auto text-[10px] text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">delete</button>
              )}
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">{c.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-1.5 mt-2 pl-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          maxLength={1000}
          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
        />
        <button type="submit" disabled={!text.trim() || sending} className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">
          Post
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Members section: list + invite + role management (owner).
// ---------------------------------------------------------------------------
function MembersSection({ itinerary, isOwner, currentUserId, onChanged, onError }) {
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null)

  const invite = async (e) => {
    e.preventDefault()
    if (!email.trim() || inviting) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const { data } = await api.post(`/itineraries/${itinerary.id}/members`, { email: email.trim() })
      // The invitee joins via the emailed link, so the member list updates once
      // they accept — here we just confirm the invitation was sent.
      setInviteMsg(data.message || `Invitation emailed to ${email.trim()}.`)
      setEmail('')
      setTimeout(() => setInviteMsg(null), 6000)
    } catch (err) {
      onError?.(err.response?.data?.error || 'Could not invite that person')
    } finally {
      setInviting(false)
    }
  }

  const changeRole = async (member, role) => {
    try {
      const { data } = await api.patch(`/itineraries/${itinerary.id}/members/${member.userId}`, { role })
      onChanged?.(data)
    } catch (err) {
      onError?.(err.response?.data?.error || 'Could not change role')
    }
  }

  const removeMember = async (member) => {
    try {
      const { data } = await api.delete(`/itineraries/${itinerary.id}/members/${member.userId}`)
      onChanged?.(data)
    } catch (err) {
      onError?.(err.response?.data?.error || 'Could not remove member')
    }
  }

  return (
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Members</p>
      <ul className="space-y-2">
        {(itinerary.members || []).map((m) => (
          <li key={m.userId} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
              {m.picture ? <img src={m.picture} alt="" className="w-full h-full object-cover" /> : (m.name?.[0]?.toUpperCase() || '?')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">
                {m.name || m.email}
                {m.userId === currentUserId && <span className="text-slate-400"> (you)</span>}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
            </div>
            {m.role === 'owner' ? (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Owner</span>
            ) : isOwner ? (
              <div className="flex items-center gap-1">
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value)}
                  className="text-[11px] border border-slate-200 rounded-md px-1 py-0.5 text-slate-600 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="button" onClick={() => removeMember(m)} className="text-slate-300 hover:text-red-500" aria-label="Remove member">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{m.role}</span>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <>
          <form onSubmit={invite} className="flex items-center gap-1.5 mt-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Invite by email"
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
            <button type="submit" disabled={!email.trim() || inviting} className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">
              {inviting ? 'Sending…' : 'Invite'}
            </button>
          </form>
          {inviteMsg && (
            <p className="text-[11px] text-green-600 mt-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {inviteMsg}
            </p>
          )}
        </>
      )}
      <p className="text-[11px] text-slate-400 mt-2">We email an invite link — people appear here once they join. You can also use <span className="font-medium text-indigo-600">Share</span> above to invite anyone with a link.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline place search to add a stop (reuses /map/search-simple).
// ---------------------------------------------------------------------------
function AddStopSearch({ onAdd, busy }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get('/map/search-simple', { params: { q: query.trim() } })
        setResults(Array.isArray(data.results) ? data.results.slice(0, 8) : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => timer.current && clearTimeout(timer.current)
  }, [query])

  const pick = (r) => {
    onAdd({
      name: r.displayName || 'Place',
      lat: r.lat,
      lng: r.lng,
      placeId: r.placeId || null,
      address: r.displayName || null,
      category: r.category || null,
    })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="px-3 py-2.5 border-b border-slate-100 relative">
      <div className="relative">
        <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Add a place to this trip…"
          disabled={busy}
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>
      {open && (query.trim().length >= 2) && (
        <div className="absolute left-3 right-3 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-10 max-h-64 overflow-y-auto">
          {searching && <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>}
          {!searching && results.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No matches</p>}
          {results.map((r, i) => (
            <button
              key={`${r.placeId || i}`}
              type="button"
              onClick={() => pick(r)}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm text-slate-700 border-b border-slate-50 last:border-0"
            >
              <span className="block truncate">{r.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}
