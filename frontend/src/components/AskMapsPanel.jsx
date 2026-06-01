import { useState, useRef, useEffect } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'
import { formatDistanceMeters } from '../utils/formatDistance'
import TranslatedLabel from './TranslatedLabel'

const EXAMPLE_QUERIES = [
  'Best hotels near me',
  'ATM within 2 km',
  'Temples in Kadaba',
  'Restaurants open now',
]

const AskMapsPanel = ({
  currentLocation,
  mapRef,
  onClose,
  onResults,
  onPlaceSelect,
  onDirections,
}) => {
  const tTitle = useTranslate('Ask Maps')
  const tSubtitle = useTranslate('Ask in plain language — AI finds places on the map')
  const tPlaceholder = useTranslate('e.g. Best hotels near me')
  const tAsk = useTranslate('Ask')
  const tClose = useTranslate('Close')
  const tSearching = useTranslate('Searching...')
  const tNoResults = useTranslate('No matching places found. Try a different question.')
  const tFailed = useTranslate('Could not process your question. Try again.')
  const tResults = useTranslate('Results')
  const tDirections = useTranslate('Directions')
  const tTryExamples = useTranslate('Try an example')

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [interpretation, setInterpretation] = useState('')
  const [places, setPlaces] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getContextCoords = () => {
    if (currentLocation?.lat != null && currentLocation?.lng != null) {
      return { lat: currentLocation.lat, lng: currentLocation.lng }
    }
    const map = mapRef?.current?.getMap?.()
    const center = map?.getCenter?.()
    if (center) return { lat: center.lat, lng: center.lng }
    return {}
  }

  const runAsk = async (text) => {
    const q = String(text || query).trim()
    if (q.length < 2) return
    setQuery(q)
    setLoading(true)
    setError(null)
    try {
      const coords = getContextCoords()
      const { data } = await api.post('/map/ask', {
        query: q,
        ...coords,
      })
      const list = Array.isArray(data.places) ? data.places : []
      setPlaces(list)
      setInterpretation(data.interpretation || '')
      if (onResults) {
        onResults(
          list.map((p) => ({
            placeId: p.id,
            displayName: p.place_name_en || p.name,
            lat: p.latitude,
            lng: p.longitude,
            markerColor: '#7C3AED',
            category: p.category,
            distanceMeters: p.distanceMeters,
          })),
          data.center
        )
      }
    } catch (err) {
      console.error('Ask Maps error:', err)
      setPlaces([])
      setInterpretation('')
      if (onResults) onResults([], null)
      setError(err.response?.data?.message || err.response?.data?.error || tFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    runAsk(query)
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 text-white shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
            <h2 className="text-base font-bold text-slate-900">{tTitle}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-snug pr-2">{tSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center touch-manipulation"
          aria-label={tClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tPlaceholder}
            disabled={loading}
            className="input-field flex-1 min-w-0 text-sm rounded-xl border-slate-200"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="btn-primary shrink-0 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 min-h-[48px] sm:min-h-[40px] touch-manipulation"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">{tSearching}</span>
              </span>
            ) : (
              tAsk
            )}
          </button>
        </form>

        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-3 mb-1.5">
          {tTryExamples}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => runAsk(ex)}
              disabled={loading}
              className="text-xs px-2.5 py-1.5 rounded-full bg-violet-50 text-violet-800 border border-violet-100 hover:bg-violet-100 transition-colors disabled:opacity-50 touch-manipulation"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {interpretation && !error && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 mb-3 border border-slate-100 leading-relaxed">
            {interpretation}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</p>
        )}
        {!loading && !error && places.length === 0 && query.trim().length >= 2 && (
          <p className="text-sm text-slate-500 text-center py-8">{tNoResults}</p>
        )}
        {places.length > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-2">
              {tResults} ({places.length})
            </p>
            <ul className="space-y-2 pb-4">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => onPlaceSelect?.(place)}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white hover:border-violet-200 hover:shadow-sm px-3 py-2.5 transition-all touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate flex-1">
                        {place.place_name_en || place.name}
                      </p>
                      {place.distanceMeters != null && (
                        <span className="text-xs font-medium text-violet-700 tabular-nums shrink-0">
                          {formatDistanceMeters(place.distanceMeters)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full truncate">
                        <TranslatedLabel text={place.category || 'Other'} />
                      </span>
                      {place.rating != null && (
                        <span className="text-[11px] text-amber-700 font-medium tabular-nums">
                          ★ {place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {(place.village || place.district) && (
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        {[place.village, place.district].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDirections?.(place)
                    }}
                    className="mt-1 w-full py-2 text-xs font-semibold text-[#4285F4] hover:bg-blue-50 rounded-lg transition-colors touch-manipulation min-h-[40px]"
                  >
                    {tDirections}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default AskMapsPanel
