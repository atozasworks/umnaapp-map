import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'
import { formatDistanceMeters } from '../utils/formatDistance'
import {
  PUBLIC_UTILITY_TYPES,
  UTILITY_DEFAULT_RADIUS_METERS,
  UTILITY_RADIUS_OPTIONS,
  buildGoogleMapsNavUrl,
  getUtilityTypeMeta,
  toUtilityOverlayPlace,
} from '../utils/publicUtilities'

function UtilityIcon({ type, className = 'w-5 h-5' }) {
  const stroke = 'currentColor'
  switch (type) {
    case 'toilet':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v7m8-7v7M5 10h14M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4" />
        </svg>
      )
    case 'water':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-3.5 5-6 8.2-6 11a6 6 0 0012 0c0-2.8-2.5-6-6-11z" />
        </svg>
      )
    case 'bolt':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      )
    case 'wifi':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12.5a9 9 0 0114 0M8.5 15.5a4.5 4.5 0 017 0M12 19h.01" />
        </svg>
      )
    case 'parking':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7h4a3 3 0 010 6H9m-4 8h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    case 'bus':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10h16M6 6h12a2 2 0 012 2v9H4V8a2 2 0 012-2zm2 13h2m8 0h2M7 14h.01M17 14h.01" />
        </svg>
      )
    case 'shield':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
        </svg>
      )
    case 'fire':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c2 3 5 4.5 5 8a5 5 0 11-10 0c0-2 1-3.5 2.5-5C10 7 11 5.5 12 3z" />
        </svg>
      )
    case 'hospital':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8M5 5h14v14H5V5z" />
        </svg>
      )
    case 'atm':
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M6 9V7a2 2 0 012-2h8a2 2 0 012 2v2m-1 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2V9m3 4h4" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" stroke={stroke} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
  }
}

/**
 * Bottom sheet / side panel for Public Utility Finder.
 */
export default function PublicUtilityFinderSheet({
  isOpen,
  onClose,
  currentLocation,
  mapRef,
  onResults,
  onClearResults,
  onPlaceSelect,
  onDirections,
  selectedPlaceId = null,
}) {
  const tTitle = useTranslate('Public Utility Finder')
  const tSubtitle = useTranslate('Find nearby public utilities on the map')
  const tRadius = useTranslate('Search radius')
  const tCategories = useTranslate('Categories')
  const tResults = useTranslate('Nearby')
  const tLoading = useTranslate('Searching nearby…')
  const tEmpty = useTranslate('No utilities found in this radius. Try a larger radius or another category.')
  const tNeedLocation = useTranslate('Waiting for your location…')
  const tClose = useTranslate('Close')
  const tClear = useTranslate('Clear')
  const tDirections = useTranslate('Directions')
  const tGoogle = useTranslate('Open in Google Maps')
  const tFailed = useTranslate('Could not load utilities. Try again.')

  const [radiusMeters, setRadiusMeters] = useState(UTILITY_DEFAULT_RADIUS_METERS)
  const [selectedType, setSelectedType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState([])
  const [activePlaceId, setActivePlaceId] = useState(null)

  const getCoords = useCallback(() => {
    if (Number.isFinite(currentLocation?.lat) && Number.isFinite(currentLocation?.lng)) {
      return { lat: currentLocation.lat, lng: currentLocation.lng }
    }
    const center = mapRef?.current?.getMap?.()?.getCenter?.()
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      return { lat: center.lat, lng: center.lng }
    }
    return null
  }, [currentLocation, mapRef])

  const clearAll = useCallback(() => {
    setResults([])
    setSelectedType(null)
    setActivePlaceId(null)
    setError(null)
    onClearResults?.()
  }, [onClearResults])

  useEffect(() => {
    if (!isOpen) return undefined
    return () => {}
  }, [isOpen])

  const fetchUtilities = async (typeId, radius = radiusMeters) => {
    const coords = getCoords()
    if (!coords) {
      setError(tNeedLocation)
      return
    }
    setSelectedType(typeId)
    setLoading(true)
    setError(null)
    setActivePlaceId(null)
    try {
      const { data } = await api.get('/map/utilities/nearby', {
        params: {
          lat: coords.lat,
          lng: coords.lng,
          type: typeId,
          radiusMeters: radius,
        },
      })
      const list = Array.isArray(data?.results) ? data.results : []
      const overlay = list
        .map((p) => toUtilityOverlayPlace(p, typeId))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      setResults(overlay)
      onResults?.(overlay, coords)
    } catch (err) {
      console.warn('[PublicUtilityFinder]', err)
      setResults([])
      onClearResults?.()
      setError(err.response?.data?.error || tFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleRadiusChange = (meters) => {
    setRadiusMeters(meters)
    if (selectedType) fetchUtilities(selectedType, meters)
  }

  const handleSelectResult = (place) => {
    setActivePlaceId(place.placeId)
    onPlaceSelect?.(place)
    if (mapRef?.current?.flyTo && Number.isFinite(place.lng) && Number.isFinite(place.lat)) {
      mapRef.current.flyTo({
        center: [place.lng, place.lat],
        zoom: 16,
        duration: 600,
      })
    }
  }

  if (!isOpen) return null

  const meta = getUtilityTypeMeta(selectedType)
  const highlightId = selectedPlaceId || activePlaceId

  return (
    <div
      className="fixed inset-0 z-[350] flex items-end sm:items-stretch sm:justify-start pointer-events-none"
      role="dialog"
      aria-label={tTitle}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30 sm:bg-black/20 pointer-events-auto"
        aria-label={tClose}
        onClick={onClose}
      />

      <div
        className="relative pointer-events-auto w-full sm:w-[380px] sm:max-w-[90vw] sm:h-full sm:mt-0 max-h-[78vh] sm:max-h-none bg-white rounded-t-2xl sm:rounded-none shadow-2xl border border-slate-200/80 flex flex-col animate-sheet-up sm:animate-fade-in pb-[env(safe-area-inset-bottom)] sm:pt-[env(safe-area-inset-top)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100">
          <div className="min-w-0">
            <div className="mx-auto sm:hidden w-10 h-1 rounded-full bg-slate-200 mb-2" />
            <h2 className="text-base font-bold text-slate-900">{tTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{tSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={tClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{tRadius}</p>
          <div className="flex flex-wrap gap-1.5">
            {UTILITY_RADIUS_OPTIONS.map((opt) => {
              const active = radiusMeters === opt.meters
              return (
                <button
                  key={opt.meters}
                  type="button"
                  onClick={() => handleRadiusChange(opt.meters)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors touch-manipulation ${
                    active
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{tCategories}</p>
          <div className="grid grid-cols-2 gap-2 max-h-[40vh] sm:max-h-none overflow-y-auto pr-0.5">
            {PUBLIC_UTILITY_TYPES.map((u) => {
              const active = selectedType === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={loading}
                  onClick={() => fetchUtilities(u.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left min-h-[48px] touch-manipulation transition-colors disabled:opacity-60 ${
                    active
                      ? 'border-teal-600 bg-teal-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${u.color}18`, color: u.color }}
                  >
                    <UtilityIcon type={u.icon} className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-800 leading-snug">{u.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {tResults}
              {meta ? ` · ${meta.label}` : ''}
              {results.length > 0 ? ` (${results.length})` : ''}
            </p>
            {(results.length > 0 || selectedType) && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
              >
                {tClear}
              </button>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">{tLoading}</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && selectedType && results.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-6 text-center">
              <p className="text-sm text-slate-600">{tEmpty}</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
              {results.map((place) => {
                const active = highlightId && String(highlightId) === String(place.placeId)
                return (
                  <li key={place.placeId}>
                    <div
                      className={`px-3 py-2.5 ${active ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectResult(place)}
                        className="w-full text-left touch-manipulation"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800 truncate">
                              {place.displayName}
                            </span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">
                              {place.category}
                              {place.distanceMeters != null
                                ? ` · ${formatDistanceMeters(place.distanceMeters)}`
                                : ''}
                            </span>
                            {place.address && (
                              <span className="block text-[11px] text-slate-400 mt-0.5 truncate">
                                {place.address}
                              </span>
                            )}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: place.markerColor }}
                          />
                        </span>
                      </button>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => onDirections?.(place)}
                          className="flex-1 min-h-[36px] rounded-lg bg-teal-600 text-white text-[11px] font-semibold hover:bg-teal-700 touch-manipulation"
                        >
                          {tDirections}
                        </button>
                        <a
                          href={buildGoogleMapsNavUrl(place.lat, place.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-h-[36px] rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold hover:bg-slate-200 flex items-center justify-center touch-manipulation"
                        >
                          {tGoogle}
                        </a>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && !selectedType && !error && (
            <p className="text-xs text-slate-500 text-center py-6">
              Select a category to show nearby utilities on the map.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
