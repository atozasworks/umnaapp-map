import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslate } from 'atozas-traslate'
import api from '../services/api'
import { formatAddressSubtitle } from '../utils/formatAddress'
import { parseQueryFromInput } from '../utils/parseSearchQuery'

const CATEGORY_DEFS = [
  { id: 'directions', icon: 'route', labelEn: 'Directions', isAction: true },
  { id: 'restaurants', icon: 'restaurant', labelEn: 'Restaurants', query: 'restaurant' },
  { id: 'hotels', icon: 'hotel', labelEn: 'Hotels', query: 'hotel' },
  { id: 'things', icon: 'attraction', labelEn: 'Things to do', query: 'attraction tourism' },
  { id: 'museums', icon: 'museum', labelEn: 'Museums', query: 'museum' },
  { id: 'transit', icon: 'transit', labelEn: 'Transit', query: 'bus station train' },
  { id: 'pharmacies', icon: 'pharmacy', labelEn: 'Pharmacies', query: 'pharmacy' },
  { id: 'atm', icon: 'atm', labelEn: 'ATMs', query: 'atm' },
]

const SearchBar = ({
  onSelect,
  onRoute,
  onResultsChange,
  onSavePlace,
  onCategoryExploreChange,
  userPlaces = [],
  savingPlaceId = null,
}) => {
  const searchPlaceholder = useTranslate('Search places...')
  const tDirections = useTranslate('Directions')
  const tRestaurants = useTranslate('Restaurants')
  const tHotels = useTranslate('Hotels')
  const tThingsToDo = useTranslate('Things to do')
  const tMuseums = useTranslate('Museums')
  const tTransit = useTranslate('Transit')
  const tPharmacies = useTranslate('Pharmacies')
  const tAtms = useTranslate('ATMs')
  const tSaved = useTranslate('Saved')
  const tSaving = useTranslate('Saving...')
  const tSavePlace = useTranslate('Save place')
  const tSaveToSaved = useTranslate('Save to Saved')
  const tSearchFailed = useTranslate('Search failed. Try again.')
  const tNoPlacesFound = useTranslate('No places found')

  const categories = useMemo(
    () =>
      CATEGORY_DEFS.map((def, i) => {
        const labels = [
          tDirections,
          tRestaurants,
          tHotels,
          tThingsToDo,
          tMuseums,
          tTransit,
          tPharmacies,
          tAtms,
        ]
        const { labelEn, ...rest } = def
        return { ...rest, label: labels[i] }
      }),
    [
      tDirections,
      tRestaurants,
      tHotels,
      tThingsToDo,
      tMuseums,
      tTransit,
      tPharmacies,
      tAtms,
    ]
  )

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
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

  const buildSearchQuery = () => {
    if (activeCategory?.query && query.trim()) {
      return `${query} ${activeCategory.query}`
    }
    return query.trim()
  }

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const searchQ = buildSearchQuery()
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
      try {
        const response = await api.get('/map/search-simple', {
          params: { q: searchQ },
        })
        const resultsData = response.data.results || []
        setResults(resultsData)
        setSearchError(false)
        setShowResults(true)
        if (onResultsChange) onResultsChange(resultsData)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        setSearchError(true)
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
  }, [query, activeCategory?.id, activeCategory?.query])

  // When focused with empty/short query, show user's places from database
  useEffect(() => {
    if (isFocused && buildSearchQuery().length < 2 && dbResults.length > 0) {
      setResults(dbResults)
      setShowResults(true)
      if (onResultsChange) onResultsChange(dbResults)
    }
  }, [isFocused, query, activeCategory?.id, activeCategory?.query, userPlaces])

  // Notify parent when a map-explore category chip is toggled (Hotels, ATMs, etc.)
  useEffect(() => {
    if (!onCategoryExploreChange) return
    const explore = activeCategory && !activeCategory.isAction ? activeCategory : null
    onCategoryExploreChange(explore)
  }, [activeCategory, onCategoryExploreChange])

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
    setQuery(result.displayName)
    setShowResults(false)
    if (onSelect) {
      onSelect({ lat: result.lat, lng: result.lng, name: result.displayName, placeId: result.placeId })
    }
  }

  const handleDirectionsClick = () => {
    if (onRoute) {
      onRoute()
    }
  }

  const handleCategoryClick = (cat) => {
    if (cat.isAction) {
      handleDirectionsClick()
    } else {
      setActiveCategory(activeCategory?.id === cat.id ? null : cat)
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
    if (isPlaceSaved(result)) return
    if (onSavePlace) onSavePlace(result)
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

      {/* Category chips - scrollable on mobile */}
      <div className="flex gap-2 mt-2 sm:mt-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 snap-x snap-mandatory">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-full glass text-xs sm:text-sm font-medium transition-all snap-center min-h-[44px] ${
              cat.isAction
                ? 'text-[#4285F4] hover:bg-blue-50/80'
                : activeCategory?.id === cat.id
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'text-slate-600 hover:bg-white/60 border border-white/30'
            }`}
          >
            {cat.isAction ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : cat.icon === 'restaurant' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8h2.5V2c-1.71 0-3 1.39-3 3z" />
              </svg>
            ) : cat.icon === 'hotel' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm12-3h-8v8H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" />
              </svg>
            ) : cat.icon === 'transit' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2c-4.42 0-8 .5-8 4v10c0 .85.43 2 2 2 0 1.1.9 2 2 2s2-.9 2-2h4c0 1.1.9 2 2 2s2-.9 2-2c1.57 0 2-1.17 2-2V6c0-3.5-3.58-4-8-4zM8 16c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2-4H6V6h12v6z" />
              </svg>
            ) : cat.icon === 'pharmacy' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" />
              </svg>
            ) : cat.icon === 'museum' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v2h2v10h4V9h4v10h4V9h2V7L12 2zm0 2.18l6 3v2H6v-2l6-3z" />
              </svg>
            ) : cat.icon === 'atm' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12zm-8-2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            )}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Search Results - mobile: max height, touch-friendly */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 glass rounded-xl shadow-2xl border border-white/30 max-h-[min(60vh,320px)] sm:max-h-80 overflow-y-auto overscroll-contain">
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
                  <div className="font-medium text-slate-700 truncate">{result.displayName}</div>
                  {result.address && (() => {
                    const line2 = formatAddressSubtitle(result.address) || result.address.road || result.address.city || result.address.state || result.address.country
                    return line2 ? <div className="text-xs text-slate-500 truncate mt-0.5">{line2}</div> : null
                  })()}
                </button>
                <button
                  onClick={(e) => handleSaveClick(e, result)}
                  disabled={saved || isSaving}
                  className={`flex-shrink-0 p-2 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    saved
                      ? 'text-primary-600 cursor-default'
                      : isSaving
                      ? 'text-primary-500 cursor-wait'
                      : 'text-slate-400 hover:text-primary-600 hover:bg-white/50 active:bg-white/70'
                  }`}
                  aria-label={saved ? tSaved : isSaving ? tSaving : tSavePlace}
                  title={saved ? tSaved : isSaving ? tSaving : tSaveToSaved}
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

      {showResults && results.length === 0 && buildSearchQuery().length >= 2 && !isSearching && (
        <div className="absolute z-50 w-full mt-2 glass rounded-xl shadow-2xl border border-white/30 p-4 text-center text-sm">
          {searchError ? (
            <span className="text-amber-600">{tSearchFailed}</span>
          ) : (
            <span className="text-slate-500">{tNoPlacesFound}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
