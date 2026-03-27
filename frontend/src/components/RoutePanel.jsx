import { useState, useRef, useEffect } from 'react'
import api from '../services/api'
import { formatAddressSubtitle } from '../utils/formatAddress'
import { parseQueryFromInput } from '../utils/parseSearchQuery'

const PlaceSearchInput = ({ label, placeholder, value, onSelect, onClear, onResultsChange, icon, iconColor }) => {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef(null)
  const containerRef = useRef(null)

  // Sync display when value is cleared externally
  useEffect(() => {
    if (!value) setQuery('')
    else if (value.name && value.name !== query) setQuery(value.name)
  }, [value])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (query.length < 2 || (value && value.name === query)) {
      setResults([])
      setShowResults(false)
      if (onResultsChange) onResultsChange([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await api.get('/map/search-simple', {
          params: { q: query },
        })
        const res = response.data.results || []
        setResults(res)
        setShowResults(true)
        if (onResultsChange) onResultsChange(res)
      } catch (err) {
        console.error('Search error:', err)
        setResults([])
        if (onResultsChange) onResultsChange([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

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
    setQuery(parseQueryFromInput(e.target.value))
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
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <div className="relative flex items-center">
        {icon && (
          <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex-shrink-0 ${iconColor || 'bg-slate-400'}`} />
        )}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full py-2.5 sm:py-2 pr-8 glass rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 text-base sm:text-sm min-h-[44px] sm:min-h-0 ${icon ? 'pl-8' : 'px-3'}`}
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
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-[min(50vh,220px)] sm:max-h-52 overflow-y-auto overscroll-contain">
          {results.map((result) => (
            <button
              key={result.placeId}
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2.5 sm:py-2 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0 min-h-[48px] sm:min-h-0 flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-700 truncate">{result.displayName}</div>
                {result.address && (() => {
                  const line2 = formatAddressSubtitle(result.address) || result.address.road || result.address.city || result.address.state
                  return line2 ? <div className="text-xs text-slate-500 truncate">{line2}</div> : null
                })()}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-center text-slate-500 text-sm">
          No places found
        </div>
      )}
    </div>
  )
}

/* ─── Thumbnail for a place (loads first photo from API if placeId is a UUID) ─── */
const PlaceThumbnail = ({ place }) => {
  const [thumb, setThumb] = useState(null)

  useEffect(() => {
    if (!place) return
    const placeId = place.placeId || place.id
    if (!placeId || !/^[0-9a-f-]{36}$/.test(String(placeId))) return
    let cancelled = false
    api.get(`/map/places/${placeId}/photos`)
      .then(({ data }) => {
        if (!cancelled && data.photos?.length > 0) setThumb(data.photos[0].dataUrl)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [place])

  if (thumb) {
    return <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  )
}

const TRAVEL_MODES = [
  { id: 'driving', label: 'Car', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
  )},
  { id: 'two_wheeler', label: 'Two Wheeler', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17V5l4 4"/><path d="M5 17h6l3-6h5"/></svg>
  )},
  { id: 'walking', label: 'Walk', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 4a1 1 0 11-2 0 1 1 0 012 0zM10.5 7.5L8 14l2.5 3.5L13 21m-2.5-3.5L8 21m5-14l2 3.5L18 14" /></svg>
  )},
  { id: 'cycling', label: 'Cycle', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h3"/></svg>
  )},
]

const RoutePanel = ({ mapRef, currentLocation, onCalculateRoute, onClose, onSearchResultsChange, onRoutePlacesChange, initialEndPlace }) => {
  const [startPlace, setStartPlace] = useState(null)
  const [endPlace, setEndPlace] = useState(() => initialEndPlace || null)
  const [waypoints, setWaypoints] = useState([])
  const [travelMode, setTravelMode] = useState('driving')
  const [isCalculating, setIsCalculating] = useState(false)
  const [routeData, setRouteData] = useState(null)
  const [isRouteEdited, setIsRouteEdited] = useState(false)
  const [allModesData, setAllModesData] = useState(null) // { driving: {...}, two_wheeler: {...}, ... }
  const [error, setError] = useState(null)
  const nextWpId = useRef(1)

  // Notify parent when start/end places change so map can show blue/red markers
  useEffect(() => {
    if (onRoutePlacesChange) {
      onRoutePlacesChange(startPlace, endPlace)
    }
  }, [startPlace, endPlace, onRoutePlacesChange])

  useEffect(() => {
    if (!mapRef?.current?.setRouteEditHandler) return

    mapRef.current.setRouteEditHandler((updatedRoute) => {
      setRouteData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ...updatedRoute,
          duration: updatedRoute.duration ?? prev.duration,
          legs: updatedRoute.legs ?? prev.legs,
        }
      })
      setIsRouteEdited(true)
    })

    return () => {
      mapRef.current?.setRouteEditHandler?.(null)
    }
  }, [mapRef])

  const handleCalculate = async (modeOverride) => {
    if (!startPlace || !endPlace) {
      setError('Please select both start and end places')
      return
    }

    const mode = modeOverride || travelMode
    setIsCalculating(true)
    setError(null)

    try {
      const start = { lat: startPlace.lat, lng: startPlace.lng }
      const end = { lat: endPlace.lat, lng: endPlace.lng }
      const wp = waypoints.filter((w) => w.place).map((w) => ({ lat: w.place.lat, lng: w.place.lng }))

      if (mapRef?.current?.calculateRoute) {
        const route = await mapRef.current.calculateRoute(start, end, wp, mode)
        setRouteData(route)
        setIsRouteEdited(false)
        // Now fetch all travel modes in background for comparison
        fetchAllModes(start, end, wp, mode, route)
      } else if (onCalculateRoute) {
        const route = await onCalculateRoute(start, end, wp, mode)
        setRouteData(route)
        setIsRouteEdited(false)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to calculate route')
    } finally {
      setIsCalculating(false)
    }
  }

  const fetchAllModes = async (start, end, wp, currentMode, currentRoute) => {
    const modesResult = { [currentMode]: currentRoute }
    const otherModes = TRAVEL_MODES.map((m) => m.id).filter((m) => m !== currentMode)
    const promises = otherModes.map(async (mode) => {
      try {
        const params = {
          start: `${start.lat},${start.lng}`,
          end: `${end.lat},${end.lng}`,
          profile: mode === 'two_wheeler' ? 'driving' : mode,
        }
        if (wp.length > 0) params.waypoints = wp.map((w) => `${w.lat},${w.lng}`).join(';')
        const { data } = await api.get('/map/route', { params })
        if (mode === 'two_wheeler' && data.duration) {
          data.duration = Math.round(data.duration * 0.75)
        }
        modesResult[mode] = data
      } catch {
        // ignore failed modes
      }
    })
    await Promise.all(promises)
    setAllModesData(modesResult)
  }

  const handleModeChange = (mode) => {
    setTravelMode(mode)
    if (allModesData?.[mode]) {
      // Already have data for this mode — draw it on map
      setRouteData(allModesData[mode])
      setIsRouteEdited(false)
      if (allModesData[mode]?.geometry && mapRef?.current?.setRouteGeometry) {
        mapRef.current.setRouteGeometry(allModesData[mode].geometry, { fitBounds: false })
      }
    } else if (startPlace && endPlace) {
      // Need to calculate fresh
      handleCalculate(mode)
    }
  }

  const handleClear = () => {
    if (mapRef?.current?.clearRoute) {
      mapRef.current.clearRoute()
    }
    setRouteData(null)
    setIsRouteEdited(false)
    setAllModesData(null)
    setError(null)
  }

  const handleSwap = () => {
    const temp = startPlace
    setStartPlace(endPlace)
    setEndPlace(temp)
    // Reverse waypoints order too
    setWaypoints((prev) => [...prev].reverse())
  }

  const addWaypoint = () => {
    if (waypoints.length >= 8) return // max 8 stops
    setWaypoints((prev) => [...prev, { id: nextWpId.current++, place: null }])
  }

  const removeWaypoint = (wpId) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== wpId))
  }

  const updateWaypoint = (wpId, place) => {
    setWaypoints((prev) => prev.map((w) => (w.id === wpId ? { ...w, place } : w)))
  }

  const moveWaypoint = (index, direction) => {
    setWaypoints((prev) => {
      const arr = [...prev]
      const target = index + direction
      if (target < 0 || target >= arr.length) return arr
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return arr
    })
  }

  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes} min`
  }

  // Build ordered list of all stops for display
  const allStops = [
    { key: 'start', type: 'start', place: startPlace },
    ...waypoints.map((w) => ({ key: `wp-${w.id}`, type: 'waypoint', wpId: w.id, place: w.place })),
    { key: 'end', type: 'end', place: endPlace },
  ]

  return (
    <div className="bg-white rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200/60 w-full overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-100 bg-white flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Directions
        </h3>
        <button
          onClick={onClose}
          className="p-2 -m-1 text-slate-400 hover:text-slate-600 transition-colors rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Travel mode selector — Google Maps style tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        {TRAVEL_MODES.map((mode) => {
          const isActive = travelMode === mode.id
          const modeData = allModesData?.[mode.id]
          return (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-all relative ${
                isActive
                  ? 'text-primary-700'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title={mode.label}
            >
              <div className={isActive ? 'text-primary-600' : ''}>{mode.icon}</div>
              <span className="text-[10px] font-medium leading-none">{mode.label}</span>
              {modeData && (
                <span className={`text-[9px] font-semibold leading-none ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>
                  {formatDuration(modeData.duration)}
                </span>
              )}
              {isActive && <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-primary-600 rounded-full" />}
            </button>
          )
        })}
      </div>

      {/* Scrollable stops area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <div className="relative">
          {/* Vertical line connecting dots */}
          <div className="absolute left-[11px] top-5 bottom-5 w-0.5 bg-slate-300" style={{ zIndex: 0 }} />

          <div className="space-y-2 relative" style={{ zIndex: 1 }}>
            {/* START */}
            <div className="flex items-start gap-2.5">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-[22px] h-[22px] rounded-full bg-blue-500 border-[3px] border-white shadow-md flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <PlaceSearchInput
                  placeholder="Choose starting point"
                  value={startPlace}
                  onSelect={setStartPlace}
                  onClear={() => setStartPlace(null)}
                  onResultsChange={onSearchResultsChange}
                />
                {currentLocation && !startPlace && (
                  <button
                    onClick={() => setStartPlace(currentLocation)}
                    className="mt-1 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                    </svg>
                    Your location
                  </button>
                )}
                {startPlace && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <PlaceThumbnail place={startPlace} />
                    <span className="text-xs text-slate-600 truncate">{startPlace.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* WAYPOINTS */}
            {waypoints.map((wp, idx) => (
              <div key={wp.id} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div className="w-[22px] h-[22px] rounded-full bg-slate-500 border-[3px] border-white shadow-md flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{idx + 1}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <PlaceSearchInput
                        placeholder={`Add stop ${idx + 1}`}
                        value={wp.place}
                        onSelect={(p) => updateWaypoint(wp.id, p)}
                        onClear={() => updateWaypoint(wp.id, null)}
                        onResultsChange={onSearchResultsChange}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      {idx > 0 && (
                        <button onClick={() => moveWaypoint(idx, -1)} className="p-0.5 text-slate-400 hover:text-slate-600" title="Move up">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                      )}
                      {idx < waypoints.length - 1 && (
                        <button onClick={() => moveWaypoint(idx, 1)} className="p-0.5 text-slate-400 hover:text-slate-600" title="Move down">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => removeWaypoint(wp.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove stop"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {wp.place && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <PlaceThumbnail place={wp.place} />
                      <span className="text-xs text-slate-600 truncate">{wp.place.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* END */}
            <div className="flex items-start gap-2.5">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-[22px] h-[22px] rounded-full bg-red-500 border-[3px] border-white shadow-md flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <PlaceSearchInput
                  placeholder="Choose destination"
                  value={endPlace}
                  onSelect={setEndPlace}
                  onClear={() => setEndPlace(null)}
                  onResultsChange={onSearchResultsChange}
                />
                {endPlace && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <PlaceThumbnail place={endPlace} />
                    <span className="text-xs text-slate-600 truncate">{endPlace.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add stop + Swap */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={addWaypoint}
            disabled={waypoints.length >= 8}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add stop
          </button>
          <button
            onClick={handleSwap}
            className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
            title="Reverse route"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-xs font-medium">Swap</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
          </div>
        )}

        {/* Route result */}
        {routeData && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-primary-50 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              {TRAVEL_MODES.find((m) => m.id === travelMode)?.icon}
              <span className="text-xs font-semibold text-blue-700">
                {TRAVEL_MODES.find((m) => m.id === travelMode)?.label} Route
              </span>
              {isRouteEdited && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  Edited
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Distance</div>
                <div className="text-lg font-bold text-slate-800">{formatDistance(routeData.distance)}</div>
              </div>
              <div className="w-px h-8 bg-blue-200" />
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">Duration</div>
                <div className="text-lg font-bold text-slate-800">{formatDuration(routeData.duration)}</div>
              </div>
              {waypoints.filter((w) => w.place).length > 0 && (
                <>
                  <div className="w-px h-8 bg-blue-200" />
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Stops</div>
                    <div className="text-lg font-bold text-slate-800">{waypoints.filter((w) => w.place).length}</div>
                  </div>
                </>
              )}
            </div>

            {/* Quick compare all modes */}
            {allModesData && Object.keys(allModesData).length > 1 && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Compare</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TRAVEL_MODES.map((mode) => {
                    const d = allModesData[mode.id]
                    if (!d) return null
                    const isActive = travelMode === mode.id
                    return (
                      <button
                        key={mode.id}
                        onClick={() => handleModeChange(mode.id)}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-all ${
                          isActive ? 'bg-primary-100 ring-1 ring-primary-300' : 'bg-white/70 hover:bg-white'
                        }`}
                      >
                        <span className={isActive ? 'text-primary-600' : 'text-slate-400'}>{mode.icon}</span>
                        <div className="min-w-0">
                          <div className={`text-[10px] font-semibold truncate ${isActive ? 'text-primary-700' : 'text-slate-600'}`}>
                            {formatDuration(d.duration)}
                          </div>
                          <div className="text-[9px] text-slate-400">{formatDistance(d.distance)}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Leg-by-leg breakdown for multi-stop */}
            {routeData.legs && routeData.legs.length > 1 && (
              <div className="mt-2 pt-2 border-t border-blue-200 space-y-1">
                {routeData.legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate mr-2">
                      {allStops[i]?.place?.name ? allStops[i].place.name.slice(0, 18) : `Stop ${i}`}
                      {' → '}
                      {allStops[i + 1]?.place?.name ? allStops[i + 1].place.name.slice(0, 18) : `Stop ${i + 1}`}
                    </span>
                    <span className="text-slate-700 font-medium whitespace-nowrap">
                      {formatDistance(leg.distance)} · {formatDuration(leg.duration)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white flex gap-2 flex-shrink-0">
        <button
          onClick={() => handleCalculate()}
          disabled={isCalculating || !startPlace || !endPlace}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg"
        >
          {isCalculating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
              Calculating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Get Directions
            </>
          )}
        </button>
        {routeData && (
          <button
            onClick={handleClear}
            className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-semibold text-sm"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

export default RoutePanel

