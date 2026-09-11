import { useState, useRef, useEffect } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'
import { formatSearchSuggestion } from '../utils/formatAddress'
import { parseQueryFromInput } from '../utils/parseSearchQuery'

const SearchBar = ({
  onSelect,
  onRoute,
  onAskMaps,
  onResultsChange,
  onSavePlace,
  onUnsavePlace,
  userPlaces = [],
  savingPlaceId = null,
}) => {
  const searchPlaceholder = useTranslate('Search places...')
  const tDirections = useTranslate('Directions')
  const tSaving = useTranslate('Saving...')
  const tSavePlace = useTranslate('Save place')
  const tSaveToSaved = useTranslate('Save to Saved')
  const tRemoveFromSaved = useTranslate('Click to remove from Saved')
  const tSearchFailed = useTranslate('Search failed. Try again.')
  const tNoPlacesFound = useTranslate('No places found')
  const tSearchUnavailable = useTranslate('Geocoding service unavailable. Showing only saved places.')
  const tPlaceFinder = useTranslate('PlaceFinder')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [upstreamUnavailable, setUpstreamUnavailable] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const searchTimeoutRef = useRef(null)
  const resultsRef = useRef(null)

  // Convert user places (from DB) to search result format
  const dbResults = userPlaces.map((p) => ({
    placeId: p.id,
    displayName: p.name,
    lat: p.latitude,
    lng: p.longitude,
    address: p.category ? { county: p.category } : null,
  }))

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const searchQ = query.trim()
    if (searchQ.length < 2) {
      setResults([])
      setSearchError(false)
      if (onResultsChange) onResultsChange([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      setSearchError(false)
      setUpstreamUnavailable(false)
      try {
        const response = await api.get('/map/search-simple', {
          params: { q: searchQ },
        })
        const resultsData = response.data.results || []
        setResults(resultsData)
        setSearchError(false)
        setUpstreamUnavailable(Boolean(response.data.upstreamUnavailable))
        setShowResults(true)
        if (onResultsChange) onResultsChange(resultsData)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        setSearchError(true)
        setUpstreamUnavailable(false)
        setShowResults(true)
        if (onResultsChange) onResultsChange([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  // When focused with empty/short query, show user's places from database
  useEffect(() => {
    if (isFocused && query.trim().length < 2 && dbResults.length > 0) {
      setResults(dbResults)
      setShowResults(true)
      if (onResultsChange) onResultsChange(dbResults)
    }
  }, [isFocused, query, userPlaces])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target)) {
        setShowResults(false)
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (result) => {
    const { title } = formatSearchSuggestion(result)
    setQuery(title)
    setShowResults(false)
    if (onSelect) {
      onSelect({ lat: result.lat, lng: result.lng, name: title, placeId: result.placeId })
    }
  }

  const handleDirectionsClick = () => {
    if (onRoute) {
      onRoute()
    }
  }

  const isPlaceSaved = (result) => {
    const tol = 0.0001
    return userPlaces.some(
      (p) =>
        String(p.id) === String(result.placeId) ||
        (Math.abs(p.latitude - result.lat) < tol && Math.abs(p.longitude - result.lng) < tol)
    )
  }

  const handleSaveClick = (e, result) => {
    e.stopPropagation()
    const placeKey = `${result.lat}-${result.lng}`
    if (savingPlaceId === placeKey) return
    if (isPlaceSaved(result)) {
      if (onUnsavePlace) onUnsavePlace(result)
    } else if (onSavePlace) {
      onSavePlace(result)
    }
  }

  return (
    <div className="relative w-full" ref={resultsRef}>
      {/* Main search bar - Google Maps style, touch-friendly */}
      <div className="flex items-center gap-1.5 sm:gap-2 glass rounded-full pl-3 pr-1 py-2 sm:py-1.5 shadow-lg border border-white/30 min-h-[48px] sm:min-h-0">
        {/* Search input */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(parseQueryFromInput(e.target.value))}
            onFocus={() => setIsFocused(true)}
            placeholder={searchPlaceholder}
            className="flex-1 min-w-0 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 placeholder-slate-500 text-base sm:text-sm py-1 min-h-[24px]"
          />
          {isSearching ? (
            <div className="flex-shrink-0 animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent" />
          ) : (
            <svg
              className="w-5 h-5 text-slate-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        {/* PlaceFinder — AI search */}
        {onAskMaps && (
          <button
            type="button"
            onClick={onAskMaps}
            className="flex-shrink-0 p-2.5 sm:p-2 rounded-full hover:bg-violet-100 active:bg-violet-200 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label={tPlaceFinder}
            title={tPlaceFinder}
          >
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        )}

        {/* Directions button - blue arrow like Google Maps */}
        <button
          onClick={handleDirectionsClick}
          className="flex-shrink-0 p-2.5 sm:p-2 rounded-full hover:bg-blue-100 active:bg-blue-200 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          aria-label={tDirections}
        >
          <svg
            className="w-5 h-5 text-[#4285F4]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Search Results - mobile: max height, touch-friendly */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 glass rounded-xl shadow-2xl border border-white/30 max-h-[min(60vh,320px)] sm:max-h-80 overflow-y-auto overscroll-contain">
          {upstreamUnavailable && (
            <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50/80 border-b border-amber-200/60">
              {tSearchUnavailable}
            </div>
          )}
          {results.map((result) => {
            const saved = isPlaceSaved(result)
            const placeKey = `${result.lat}-${result.lng}`
            const isSaving = savingPlaceId === placeKey
            return (
              <div
                key={result.placeId}
                className="flex items-center gap-2 px-4 py-3.5 sm:py-3 border-b border-white/20 last:border-b-0 min-h-[52px] sm:min-h-0 group"
              >
                <button
                  onClick={() => handleSelect(result)}
                  className="flex-1 min-w-0 text-left hover:bg-white/40 active:bg-white/50 transition-colors rounded-lg -m-1 p-1 flex flex-col"
                >
                  {(() => {
                    const { title, subtitle } = formatSearchSuggestion(result)
                    return (
                      <>
                        <div className="font-medium text-slate-700 truncate">{title}</div>
                        {subtitle ? (
                          <div className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</div>
                        ) : null}
                      </>
                    )
                  })()}
                </button>
                <button
                  onClick={(e) => handleSaveClick(e, result)}
                  disabled={isSaving}
                  className={`flex-shrink-0 p-2 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    isSaving
                      ? 'text-primary-500 cursor-wait'
                      : saved
                      ? 'text-primary-600 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100'
                      : 'text-slate-400 hover:text-primary-600 hover:bg-white/50 active:bg-white/70'
                  }`}
                  aria-label={saved ? tRemoveFromSaved : isSaving ? tSaving : tSavePlace}
                  title={saved ? tRemoveFromSaved : isSaving ? tSaving : tSaveToSaved}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill={saved ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showResults && results.length === 0 && query.trim().length >= 2 && !isSearching && (
        <div className="absolute z-50 w-full mt-2 glass rounded-xl shadow-2xl border border-white/30 p-4 text-center text-sm">
          {searchError ? (
            <span className="text-amber-600">{tSearchFailed}</span>
          ) : upstreamUnavailable ? (
            <span className="text-amber-600">{tSearchUnavailable}</span>
          ) : (
            <span className="text-slate-500">{tNoPlacesFound}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
