import { useState, useRef, useEffect } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'
import { formatDistanceMeters } from '../utils/formatDistance'
import {
  formatPlaceAddressLine,
  getPlaceThumbnail,
  getStoredRating,
  getStoredReviewCount,
  isPlaceOpenNow,
  markerColorForCategory,
  supplementFromMapPlaces,
} from '../utils/placeDisplay'
import TranslatedLabel from './TranslatedLabel'

const EXAMPLE_QUERIES = [
  'Best hotels near me',
  'ATM or hotels within 2 km',
  'Temples in Kadaba',
  'Restaurants open now',
]

const AskMapsPanel = ({
  currentLocation,
  mapRef,
  mapPlaces = [],
  onClose,
  onResults,
  onPlaceSelect,
  onDirections,
  selectedPlaceId = null,
}) => {
  const tTitle = useTranslate('PlaceFinder')
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
  const tOpen = useTranslate('Open')
  const tClosed = useTranslate('Closed')

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [interpretation, setInterpretation] = useState('')
  const [places, setPlaces] = useState([])
  const [aiEnabled, setAiEnabled] = useState(true)
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
      let list = Array.isArray(data.places) ? data.places : []
      const apiCount = list.length
      list = supplementFromMapPlaces(list, q, coords, mapPlaces)
      setPlaces(list)
      let interp = data.interpretation || ''
      if (list.length > apiCount) {
        interp = `${interp}${interp ? ' ' : ''}(includes ${list.length - apiCount} from your map)`
      }
      setInterpretation(interp)
      setAiEnabled(data.aiEnabled !== false)
      if (onResults) {
        onResults(
          list.map((p) => ({
            ...p,
            placeId: p.id,
            displayName: p.place_name_en || p.name,
            lat: p.latitude,
            lng: p.longitude,
            markerColor: markerColorForCategory(p.category),
          })),
          data.center
        )
      }
    } catch (err) {
      console.error('PlaceFinder error:', err)
      setPlaces([])
      setInterpretation('')
      if (onResults) onResults([], null)
      const data = err.response?.data
      const validationMsg = Array.isArray(data?.errors)?.[0]?.msg
      setError(
        data?.message ||
          validationMsg ||
          data?.error ||
          (err.response?.status === 401 ? 'Please sign in again.' : null) ||
          tFailed
      )
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
            {!aiEnabled && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                Offline mode
              </span>
            )}
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
            className="input-field flex-1 min-w-0 text-base sm:text-sm rounded-xl border-slate-200"
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
              {places.map((place) => {
                const name = place.place_name_en || place.name
                const address = formatPlaceAddressLine(place)
                const rating = getStoredRating(place)
                const reviewCount = getStoredReviewCount(place)
                const thumb = getPlaceThumbnail(place)
                const openNow = isPlaceOpenNow(place)
                const isSelected = selectedPlaceId != null && String(selectedPlaceId) === String(place.id)
                const catColor = markerColorForCategory(place.category)

                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => onPlaceSelect?.(place)}
                      className={`w-full text-left rounded-xl border bg-white px-3 py-2.5 transition-all touch-manipulation ${
                        isSelected
                          ? 'border-violet-400 ring-2 ring-violet-200 shadow-md'
                          : 'border-slate-200 hover:border-violet-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl"
                          style={{
                            background: thumb ? undefined : `${catColor}18`,
                          }}
                        >
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span style={{ color: catColor }}>📍</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                              {name}
                            </p>
                            {place.distanceMeters != null && (
                              <span className="text-xs font-medium text-violet-700 tabular-nums shrink-0">
                                {formatDistanceMeters(place.distanceMeters)}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${catColor}18`, color: catColor }}
                            >
                              <TranslatedLabel text={place.category || 'Other'} />
                            </span>
                            {openNow != null && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  openNow
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-orange-50 text-orange-700'
                                }`}
                              >
                                {openNow ? tOpen : tClosed}
                              </span>
                            )}
                            {rating != null && (
                              <span className="text-[11px] text-amber-700 font-medium tabular-nums ml-auto">
                                ★ {rating.toFixed(1)}
                                {reviewCount != null && (
                                  <span className="text-slate-400 font-normal"> ({reviewCount})</span>
                                )}
                              </span>
                            )}
                          </div>
                          {address && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {address}
                            </p>
                          )}
                        </div>
                      </div>
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
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default AskMapsPanel
