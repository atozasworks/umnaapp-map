import { useState, useRef, useEffect } from 'react'
import api from '../services/api'
import { formatAddressSubtitle } from '../utils/formatAddress'

const CATEGORIES = [
  { id: 'directions', icon: 'route', label: 'Directions', isAction: true },
  { id: 'restaurants', icon: 'restaurant', label: 'Restaurants', query: 'restaurant' },
  { id: 'hotels', icon: 'hotel', label: 'Hotels', query: 'hotel' },
  { id: 'things', icon: 'attraction', label: 'Things to do', query: 'attraction tourism' },
  { id: 'museums', icon: 'museum', label: 'Museums', query: 'museum' },
  { id: 'transit', icon: 'transit', label: 'Transit', query: 'bus station train' },
  { id: 'pharmacies', icon: 'pharmacy', label: 'Pharmacies', query: 'pharmacy' },
  { id: 'atm', icon: 'atm', label: 'ATMs', query: 'atm' },
]

const SearchBar = ({ onSelect, onRoute, onResultsChange }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const searchTimeoutRef = useRef(null)
  const resultsRef = useRef(null)

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
      setShowResults(false)
      if (onResultsChange) onResultsChange([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await api.get('/map/search', {
          params: { q: searchQ, limit: 10 },
        })
        const resultsData = response.data.results || []
        setResults(resultsData)
        setShowResults(true)
        if (onResultsChange) onResultsChange(resultsData)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        if (onResultsChange) onResultsChange([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, activeCategory?.id, activeCategory?.query])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target)) {
        setShowResults(false)
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
      onSelect({ lat: result.lat, lng: result.lng, name: result.displayName })
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

  return (
    <div className="relative w-full" ref={resultsRef}>
      {/* Main search bar - Google Maps style, touch-friendly */}
      <div className="flex items-center gap-1.5 sm:gap-2 glass rounded-full pl-2.5 pr-1 py-2 sm:py-1.5 shadow-lg border border-white/30 min-h-[48px] sm:min-h-0">
        {/* Hamburger menu */}
        <button
          type="button"
          className="p-2.5 sm:p-2 rounded-full hover:bg-slate-200/60 active:bg-slate-200/80 transition-colors text-slate-600 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        {/* Search input */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places..."
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
          aria-label="Directions"
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
        {CATEGORIES.map((cat) => (
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
          {results.map((result) => (
            <button
              key={result.placeId}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3.5 sm:py-3 text-left hover:bg-white/40 active:bg-white/50 transition-colors border-b border-white/20 last:border-b-0 flex flex-col min-h-[52px] sm:min-h-0"
            >
              <div className="font-medium text-slate-700 truncate">{result.displayName}</div>
              {result.address && (() => {
                const line2 = formatAddressSubtitle(result.address) || result.address.road || result.address.city || result.address.state || result.address.country
                return line2 ? <div className="text-xs text-slate-500 truncate mt-0.5">{line2}</div> : null
              })()}
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && buildSearchQuery().length >= 2 && !isSearching && (
        <div className="absolute z-50 w-full mt-2 glass rounded-xl shadow-2xl border border-white/30 p-4 text-center text-slate-500 text-sm">
          No places found
        </div>
      )}
    </div>
  )
}

export default SearchBar
