import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../services/api'

const PlaceSearchInput = ({ label, placeholder, value, onSelect, onClear }) => {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef(null)
  const containerRef = useRef(null)

  // Sync display when value is cleared externally
  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (query.length < 3 || (value && value.name === query)) {
      setResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await api.get('/map/search', {
          params: { q: query, limit: 6 },
        })
        setResults(response.data.results)
        setShowResults(true)
      } catch (err) {
        console.error('Search error:', err)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (result) => {
    setQuery(result.displayName)
    setShowResults(false)
    setResults([])
    onSelect({ lat: result.lat, lng: result.lng, name: result.displayName })
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    // If user edits the text after selecting, clear the selection
    if (value) onClear()
  }

  const handleClearClick = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    onClear()
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 glass rounded border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 text-sm"
        />
        {isSearching && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600" />
          </div>
        )}
        {query && (
          <button
            onClick={handleClearClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
          >
            ✕
          </button>
        )}
        {value && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <span className="text-green-500 text-xs">●</span>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 glass rounded-lg shadow-xl border border-white/20 max-h-48 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.placeId}
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2 text-left hover:bg-white/20 transition-colors border-b border-white/10 last:border-b-0"
            >
              <div className="text-sm font-medium text-slate-700 truncate">{result.displayName}</div>
              {result.address && (
                <div className="text-xs text-slate-500 truncate">
                  {result.address.road || result.address.city || result.address.state}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
        <div className="absolute z-50 w-full mt-1 glass rounded-lg shadow-xl border border-white/20 p-3 text-center text-slate-500 text-sm">
          No places found
        </div>
      )}
    </div>
  )
}

const RoutePanel = ({ mapRef, currentLocation, onCalculateRoute, onClose }) => {
  const [startPlace, setStartPlace] = useState(null)
  const [endPlace, setEndPlace] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [routeData, setRouteData] = useState(null)
  const [error, setError] = useState(null)

  const handleCalculate = async () => {
    if (!startPlace || !endPlace) {
      setError('Please select both start and end places')
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      const start = { lat: startPlace.lat, lng: startPlace.lng }
      const end = { lat: endPlace.lat, lng: endPlace.lng }

      if (mapRef?.current?.calculateRoute) {
        const route = await mapRef.current.calculateRoute(start, end)
        setRouteData(route)
      } else if (onCalculateRoute) {
        const route = await onCalculateRoute(start, end)
        setRouteData(route)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to calculate route')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleClear = () => {
    if (mapRef?.current?.clearRoute) {
      mapRef.current.clearRoute()
    }
    setRouteData(null)
    setError(null)
  }

  const handleSwap = () => {
    const temp = startPlace
    setStartPlace(endPlace)
    setEndPlace(temp)
  }

  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(2)} km`
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="glass rounded-lg p-5 shadow-xl border border-white/20 w-80">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-700">Calculate Route</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <PlaceSearchInput
            label="Start Place"
            placeholder="Search start location..."
            value={startPlace}
            onSelect={setStartPlace}
            onClear={() => setStartPlace(null)}
          />
          {currentLocation && (
            <button
              onClick={() => setStartPlace(currentLocation)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              Use my location
            </button>
          )}
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-slate-500 hover:text-slate-700"
            title="Swap start and end"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        <PlaceSearchInput
          label="End Place"
          placeholder="Search destination..."
          value={endPlace}
          onSelect={setEndPlace}
          onClear={() => setEndPlace(null)}
        />

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {routeData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-xs text-slate-500 mb-1 truncate">
              {startPlace?.name} → {endPlace?.name}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-600">Distance</div>
                <div className="text-base font-bold text-slate-700">
                  {formatDistance(routeData.distance)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Duration</div>
                <div className="text-base font-bold text-slate-700">
                  {formatDuration(routeData.duration)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            disabled={isCalculating || !startPlace || !endPlace}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Route'}
          </button>
          {routeData && (
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoutePanel

