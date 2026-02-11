import { useState, useRef, useEffect } from 'react'
import api from '../services/api'

const SearchBar = ({ onSelect, onRoute }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef(null)
  const resultsRef = useRef(null)

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await api.get('/map/search', {
          params: { q: query, limit: 10 },
        })
        setResults(response.data.results)
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

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

  const handleRoute = () => {
    if (onRoute) {
      onRoute()
    }
  }

  return (
    <div className="relative w-full max-w-2xl" ref={resultsRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for places..."
            className="w-full px-4 py-3 pl-10 glass rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600" />
            ) : (
              <svg
                className="w-5 h-5 text-slate-400"
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

          {/* Search Results */}
          {showResults && results.length > 0 && (
            <div className="absolute z-50 w-full mt-2 glass rounded-lg shadow-xl border border-white/20 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.placeId}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                >
                  <div className="font-medium text-slate-700">{result.displayName}</div>
                  {result.address && (
                    <div className="text-xs text-slate-500 mt-1">
                      {result.address.road || result.address.city || result.address.state}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
            <div className="absolute z-50 w-full mt-2 glass rounded-lg shadow-xl border border-white/20 p-4 text-center text-slate-600">
              No results found
            </div>
          )}
        </div>

        <button
          onClick={handleRoute}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Route
        </button>
      </div>
    </div>
  )
}

export default SearchBar

