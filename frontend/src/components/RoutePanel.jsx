import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'
import { formatAddressSubtitle } from '../utils/formatAddress'
import { parseQueryFromInput } from '../utils/parseSearchQuery'
import {
  getRouteTagLabel,
  getResolvedRouteStops,
  buildRouteRequestFromStops,
} from '../utils/routeHelpers'
import { highlightQuerySegments, splitPlaceSuggestion } from '../utils/gmapsSearchHighlight'
import { getSpeechController } from '../utils/speech'

const GmapsPinIcon = () => (
  <svg className="gmaps-suggestion-pin" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
  </svg>
)

const SuggestionHighlightedLine = ({ text, query, suffix }) => {
  const segments = highlightQuerySegments(text, query)
  return (
    <span className="gmaps-suggestion-text truncate block">
      {segments.map((seg, i) => (
        <span key={i} className={seg.bold ? 'match-bold' : seg.muted ? 'match-rest' : ''}>
          {seg.text}
        </span>
      ))}
      {suffix ? <span className="match-rest"> {suffix}</span> : null}
    </span>
  )
}

const GmapsSuggestionsPanel = ({ query, results, isSearching, noPlacesFound, onSelect }) => {
  if (isSearching && results.length === 0) {
    return (
      <div className="gmaps-suggestions-panel">
        <div className="gmaps-suggestions-empty">Searching…</div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="gmaps-suggestions-panel">
        <div className="gmaps-suggestions-empty">{noPlacesFound}</div>
      </div>
    )
  }

  return (
    <div className="gmaps-suggestions-panel">
      {results.map((result) => {
        const { primary, secondary } = splitPlaceSuggestion(result)
        const lineText = primary || result.displayName
        const region =
          secondary ||
          formatAddressSubtitle(result.address) ||
          result.address?.state ||
          ''
        return (
          <button
            key={result.placeId || `${result.lat}-${result.lng}-${lineText}`}
            type="button"
            className="gmaps-suggestion-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(result)}
          >
            <GmapsPinIcon />
            <div className="min-w-0 flex-1 text-left">
              <SuggestionHighlightedLine text={lineText} query={query} suffix={region} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

const PlaceSearchInput = ({
  label,
  placeholder,
  value,
  onSelect,
  onClear,
  onResultsChange,
  onSearchStateChange,
  fieldKey = '',
  icon,
  iconColor,
  variant = 'default',
}) => {
  const noPlacesFound = useTranslate('No places found')
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const searchTimeoutRef = useRef(null)
  const blurTimerRef = useRef(null)
  const containerRef = useRef(null)
  const skipValueSyncRef = useRef(false)
  const isDirections = variant === 'directions'

  // Sync displayed text from selected place; do not wipe query while user is editing
  useEffect(() => {
    if (skipValueSyncRef.current) {
      skipValueSyncRef.current = false
      return
    }
    if (value?.name) {
      setQuery((prev) => (prev === value.name ? prev : value.name))
    } else if (!value) {
      setQuery((prev) => (prev === '' ? prev : ''))
    }
  }, [value])

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
      setShowResults(true)
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
    }, 200)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [query])

  const openPanel =
    isDirections &&
    isFocused &&
    query.length >= 2 &&
    (isSearching || results.length > 0 || (!isSearching && showResults))

  const onSearchStateChangeRef = useRef(onSearchStateChange)
  onSearchStateChangeRef.current = onSearchStateChange

  useEffect(() => {
    if (!isDirections || !onSearchStateChangeRef.current) return
    onSearchStateChangeRef.current({
      fieldKey,
      query,
      results,
      isSearching,
      isFocused,
      openPanel,
    })
  }, [fieldKey, query, results, isSearching, isFocused, openPanel, isDirections])

  useEffect(() => {
    if (isDirections) return undefined
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isDirections])

  const handleSelect = (result) => {
    setQuery(result.displayName)
    setShowResults(false)
    setResults([])
    setIsFocused(false)
    onSelect({ lat: result.lat, lng: result.lng, name: result.displayName })
  }

  const handleInputChange = (e) => {
    const next = parseQueryFromInput(e.target.value)
    setQuery(next)
    if (value) {
      skipValueSyncRef.current = true
      onClear()
    }
    if (next.length >= 2) setShowResults(true)
  }

  const handleClearClick = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    onClear()
  }

  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    setIsFocused(true)
    if (query.length >= 2 && results.length > 0) setShowResults(true)
  }

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setIsFocused(false), 180)
  }

  const inputClass = isDirections
    ? 'gmaps-directions-input'
    : `w-full py-2.5 sm:py-2 pr-8 glass rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 text-base sm:text-sm min-h-[44px] sm:min-h-0 ${icon ? 'pl-8' : 'px-3'}`

  const defaultSuggestions = showResults && results.length > 0 && (
    <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-[min(50vh,220px)] sm:max-h-52 overflow-y-auto overscroll-contain">
      {results.map((result) => (
        <button
          key={result.placeId}
          type="button"
          onClick={() => handleSelect(result)}
          className="w-full px-3 py-2.5 sm:py-2 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0 min-h-[48px] sm:min-h-0 flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-medium text-slate-700 truncate">{result.displayName}</div>
            {result.address && (() => {
              const line2 = formatAddressSubtitle(result.address) || result.address.road || result.address.city || result.address.state
              return line2 ? <div className="text-xs text-slate-500 truncate">{line2}</div> : null
            })()}
          </div>
        </button>
      ))}
    </div>
  )

  return (
    <div className="gmaps-field-input-wrap" ref={containerRef}>
      {isDirections && (isFocused || query.length > 0) && (
        <svg className="gmaps-field-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M16 16l5 5" />
        </svg>
      )}
      {label && !isDirections && (
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      )}
      {icon && !isDirections && (
        <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex-shrink-0 ${iconColor || 'bg-slate-400'}`} />
      )}
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {isSearching && (
        <div className={isDirections ? 'gmaps-field-spinner' : 'absolute right-8 top-1/2 -translate-y-1/2'}>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1a73e8] border-t-transparent" />
        </div>
      )}
      {query && (
        <button
          type="button"
          onClick={handleClearClick}
          onMouseDown={(e) => e.preventDefault()}
          className={isDirections ? 'gmaps-field-clear' : 'absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm'}
          aria-label="Clear"
        >
          ×
        </button>
      )}
      {!isDirections && defaultSuggestions}
      {!isDirections && showResults && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-center text-slate-500 text-sm">
          {noPlacesFound}
        </div>
      )}
    </div>
  )
}

const GmapsStopIcon = ({ kind }) => {
  if (kind === 'end') return <div className="gmaps-stop-icon gmaps-stop-icon--end" aria-hidden />
  return <div className="gmaps-stop-icon" aria-hidden />
}

const formatModeEta = (seconds) => {
  if (!seconds || seconds < 60) return '< 1 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours} hr ${minutes} min`
  return `${minutes} min`
}

const TRAVEL_MODES = [
  { id: 'driving', label: 'Car', color: '#4285F4', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" /></svg>
  )},
  { id: 'two_wheeler', label: 'Bike', color: '#059669', icon: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17V5l4 4"/><path d="M5 17h6l3-6h5"/></svg>
  )},
  { id: 'walking', label: 'Walk', color: '#7C3AED', dashArray: [2, 3], icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 4a1 1 0 11-2 0 1 1 0 012 0zM10.5 7.5L8 14l2.5 3.5L13 21m-2.5-3.5L8 21m5-14l2 3.5L18 14" /></svg>
  )},
  { id: 'cycling', label: 'Cycle', color: '#D97706', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h3"/></svg>
  )},
  { id: 'bus', label: 'Bus', color: '#0EA5E9', dashArray: [4, 4], icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21v-2M17 21v-2M7 17h.01M17 17h.01"/></svg>
  )},
]

const MODE_ROUTE_OPTIONS = Object.fromEntries(
  TRAVEL_MODES.map((m) => [m.id, { color: m.color, ...(m.dashArray ? { dashArray: m.dashArray } : {}) }])
)

const StepIcon = ({ modifier }) => {
  const m = (modifier || '').toLowerCase()
  if (m.includes('left'))
    return <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
  if (m.includes('right'))
    return <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
  if (m.includes('uturn') || m.includes('u-turn'))
    return <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a4 4 0 010 8H9m4-8l-4-4m4 4l-4 4" /></svg>
  if (m.includes('arrive') || m.includes('destination'))
    return <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
  if (m.includes('depart') || m.includes('head'))
    return <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
  if (m.includes('roundabout') || m.includes('rotary'))
    return <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8V3m0 0l-2 2m2-2l2 2" /></svg>
  // default: straight
  return <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-4 4m4-4l4 4" /></svg>
}

const RoutePanel = ({ mapRef, currentLocation, onCalculateRoute, onClose, onSearchResultsChange, onRoutePlacesChange, onStartNavigation, initialEndPlace, initialStartPlace }) => {
  const tDirections = useTranslate('Directions')
  const tStart = useTranslate('Start')
  const tGetDirections = useTranslate('Get Directions')
  const tCalculating = useTranslate('Calculating...')
  const tClear = useTranslate('Clear')
  const tChooseStart = useTranslate('Choose starting point')
  const tChooseDestination = useTranslate('Choose destination')
  const tAddStopPrefix = useTranslate('Add stop')
  const tAddDestination = useTranslate('Add destination')
  const tYourLocation = useTranslate('Your location')
  const tPleaseSelectBoth = useTranslate('Please select both start and end places')
  const tClose = useTranslate('Close')
  const tCar = useTranslate('Car')
  const tBike = useTranslate('Bike')
  const tWalk = useTranslate('Walk')
  const tCycle = useTranslate('Cycle')
  const tBus = useTranslate('Bus')
  const tBusHint = useTranslate(
    'Bus times are estimated. Actual public transport schedules and stops may vary by city.'
  )
  const tSwap = useTranslate('Swap')
  const tReverseRoute = useTranslate('Reverse route')
  const tMoveUp = useTranslate('Move up')
  const tMoveDown = useTranslate('Move down')
  const tRemoveStop = useTranslate('Remove stop')
  const tFailedRoute = useTranslate('Failed to calculate route')
  const tAlternativeRoutes = useTranslate('Alternative routes')
  const tRoutesAvailable = useTranslate('routes available')
  const tFastest = useTranslate('Fastest')
  const tShortest = useTranslate('Shortest')
  const tRouteLabel = useTranslate('Route')
  const tAlternativesDirectOnly = useTranslate(
    'Alternative routes are only available for direct trips without extra stops.'
  )

  const travelModeLabels = useMemo(
    () => ({
      driving: tCar,
      two_wheeler: tBike,
      walking: tWalk,
      cycling: tCycle,
      bus: tBus,
    }),
    [tCar, tBike, tWalk, tCycle, tBus]
  )

  const [startPlace, setStartPlace] = useState(() => initialStartPlace || null)
  const [destinations, setDestinations] = useState(() => [
    { id: 1, place: initialEndPlace || null },
  ])

  useEffect(() => {
    if (initialStartPlace) setStartPlace(initialStartPlace)
  }, [initialStartPlace])

  useEffect(() => {
    if (initialEndPlace) {
      setDestinations((prev) => {
        const next = [...prev]
        if (next.length === 0) return [{ id: nextWpId.current++, place: initialEndPlace }]
        next[next.length - 1] = { ...next[next.length - 1], place: initialEndPlace }
        return next
      })
    }
  }, [initialEndPlace])

  const waypoints = useMemo(() => destinations.slice(0, -1), [destinations])
  const endPlace = useMemo(
    () => destinations[destinations.length - 1]?.place ?? null,
    [destinations]
  )

  const setEndPlace = useCallback((place) => {
    setDestinations((prev) => {
      const next = [...prev]
      next[next.length - 1] = { ...next[next.length - 1], place }
      return next
    })
  }, [])
  const [travelMode, setTravelMode] = useState('driving')
  const [isCalculating, setIsCalculating] = useState(false)
  const [routeData, setRouteData] = useState(null)
  const [isRouteEdited, setIsRouteEdited] = useState(false)
  const [allModesData, setAllModesData] = useState(null)
  const [alternativeRoutes, setAlternativeRoutes] = useState(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [error, setError] = useState(null)
  const [showSteps, setShowSteps] = useState(false)
  const [mobileSheetCollapsed, setMobileSheetCollapsed] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  const nextWpId = useRef(2)
  const autoCalcTimerRef = useRef(null)
  const skipNextAutoCalcRef = useRef(false)
  const [activeSearch, setActiveSearch] = useState(null)
  const tNoPlacesFound = useTranslate('No places found')

  const triggerRouteRecalcRef = useRef(null)

  useEffect(() => {
    if (!activeSearch) return undefined
    const onDocMouseDown = (e) => {
      if (
        e.target.closest('.gmaps-suggestions-panel') ||
        e.target.closest('.gmaps-input-card')
      ) {
        return
      }
      setActiveSearch(null)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [activeSearch])

  const resolvedRouteStops = useMemo(
    () => getResolvedRouteStops(startPlace, waypoints, endPlace),
    [startPlace, waypoints, endPlace]
  )

  const resolvedStopsSignature = useMemo(
    () => resolvedRouteStops.map((p) => `${p.lat},${p.lng}`).join('|'),
    [resolvedRouteStops]
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = (e) => setIsMobileViewport(e.matches)
    setIsMobileViewport(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const getRouteMapPadding = useCallback(
    (collapsed) => {
      if (!isMobileViewport) {
        return { top: 80, bottom: 50, left: 360, right: 50 }
      }
      const bottom = collapsed ? 140 : Math.min(window.innerHeight * 0.52, 400) + 32
      return { top: 110, bottom, left: 36, right: 36 }
    },
    [isMobileViewport]
  )

  const refitRouteOnMap = useCallback(
    (collapsed = mobileSheetCollapsed) => {
      mapRef?.current?.refitRouteBounds?.(getRouteMapPadding(collapsed))
    },
    [mapRef, getRouteMapPadding, mobileSheetCollapsed]
  )

  // Notify parent when stops change so map can show route markers
  useEffect(() => {
    if (onRoutePlacesChange) {
      onRoutePlacesChange(startPlace, endPlace, resolvedRouteStops)
    }
  }, [startPlace, endPlace, resolvedRouteStops, onRoutePlacesChange])

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

  useEffect(() => {
    if (!routeData) return
    const timer = window.setTimeout(() => refitRouteOnMap(mobileSheetCollapsed), 180)
    return () => window.clearTimeout(timer)
  }, [routeData, mobileSheetCollapsed, refitRouteOnMap])

  const handleSelectRoute = useCallback(
    (index) => {
      if (!alternativeRoutes || index === selectedRouteIndex) return
      setSelectedRouteIndex(index)
      const selected = alternativeRoutes[index]
      if (selected) {
        setRouteData(selected)
        setIsRouteEdited(false)
        setShowSteps(false)
        const routeOpts = MODE_ROUTE_OPTIONS[travelMode] || {}
        if (mapRef?.current?.setRouteGeometry && selected.geometry) {
          mapRef.current.setRouteGeometry({ geometry: selected.geometry }, { fitBounds: false, ...routeOpts })
        }
        if (mapRef?.current?.drawAlternativeRoutes) {
          mapRef.current.drawAlternativeRoutes(alternativeRoutes, index, handleSelectRoute, routeOpts)
        }
        refitRouteOnMap(mobileSheetCollapsed)
      }
    },
    [alternativeRoutes, selectedRouteIndex, travelMode, mapRef, mobileSheetCollapsed, refitRouteOnMap]
  )

  const fetchAlternativesForCurrentTrip = useCallback(
    async (mode) => {
      const request = buildRouteRequestFromStops(resolvedRouteStops)
      if (!request || !mapRef?.current?.calculateRoute) return
      if (request.wp.length > 0) return

      try {
        const { start, end } = request
        const routeOpts = MODE_ROUTE_OPTIONS[mode] || {}
        const result = await mapRef.current.calculateRoute(start, end, [], mode, {
          ...routeOpts,
          alternatives: true,
          fitBounds: false,
        })
        const altRoutes = result.alternatives
        if (altRoutes && altRoutes.length > 1) {
          setAlternativeRoutes(altRoutes)
          setSelectedRouteIndex(0)
          setRouteData(altRoutes[0])
          mapRef.current.drawAlternativeRoutes?.(altRoutes, 0, handleSelectRoute, routeOpts)
        } else {
          setAlternativeRoutes(null)
          mapRef.current.clearAlternativeRoutes?.()
        }
      } catch {
        setAlternativeRoutes(null)
        mapRef.current?.clearAlternativeRoutes?.()
      }
    },
    [resolvedRouteStops, mapRef, handleSelectRoute]
  )

  const handleCalculate = useCallback(async (modeOverride, stopsOverride) => {
    const stops = stopsOverride ?? resolvedRouteStops
    const request = buildRouteRequestFromStops(stops)
    if (!request) {
      setError(null)
      return
    }

    const mode = modeOverride || travelMode
    const routeOpts = MODE_ROUTE_OPTIONS[mode] || {}
    setIsCalculating(true)
    setError(null)
    setShowSteps(false)
    setAlternativeRoutes(null)
    setSelectedRouteIndex(0)

    try {
      const { start, end, wp } = request

      if (mapRef?.current?.calculateRoute) {
        const padding = getRouteMapPadding(isMobileViewport)
        const requestAlts = wp.length === 0
        const result = await mapRef.current.calculateRoute(start, end, wp, mode, {
          ...routeOpts,
          alternatives: requestAlts,
          padding,
        })
        const primary = result.route
        const altRoutes = result.alternatives

        setRouteData(primary)
        setIsRouteEdited(false)

        if (primary?.geometry && mapRef.current.setRouteGeometry) {
          mapRef.current.setRouteGeometry(
            { geometry: primary.geometry },
            { fitBounds: false, padding, ...routeOpts }
          )
        }

        window.requestAnimationFrame(() => {
          if (altRoutes && altRoutes.length > 1) {
            setAlternativeRoutes(altRoutes)
            setSelectedRouteIndex(0)
            mapRef.current?.drawAlternativeRoutes?.(altRoutes, 0, handleSelectRoute, routeOpts)
          } else {
            setAlternativeRoutes(null)
            mapRef.current?.clearAlternativeRoutes?.()
          }
          mapRef.current?.ensureRouteOnTop?.()
        })

        fetchAllModes(start, end, wp, mode, primary)

        if (isMobileViewport) {
          setMobileSheetCollapsed(true)
        } else {
          refitRouteOnMap(false)
        }
      } else if (onCalculateRoute) {
        const route = await onCalculateRoute(start, end, wp, mode)
        setRouteData(route)
        setIsRouteEdited(false)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || tFailedRoute)
    } finally {
      setIsCalculating(false)
    }
  }, [
    resolvedRouteStops,
    travelMode,
    mapRef,
    isMobileViewport,
    getRouteMapPadding,
    handleSelectRoute,
    refitRouteOnMap,
    onCalculateRoute,
    tFailedRoute,
  ])

  const recalcWithStops = useCallback(
    (stops) => {
      if (!stops || stops.length < 2) return
      skipNextAutoCalcRef.current = true
      handleCalculate(undefined, stops)
    },
    [handleCalculate]
  )

  useEffect(() => {
    triggerRouteRecalcRef.current = recalcWithStops
  }, [recalcWithStops])

  const routeDragStateRef = useRef({ startPlace, destinations })

  useEffect(() => {
    routeDragStateRef.current = { startPlace, destinations }
  }, [startPlace, destinations])

  const resolveDraggedPlaceName = useCallback(async (lat, lng) => {
    try {
      const { data } = await api.get('/map/reverse', { params: { lat, lng } })
      return data.displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }, [])

  const applyDraggedStop = useCallback((index, lat, lng) => {
    const { startPlace: start, destinations: dests } = routeDragStateRef.current
    const wps = dests.slice(0, -1)
    const end = dests[dests.length - 1]?.place ?? null
    const place = { lat, lng, name: '…' }
    const slots = [{ kind: 'start' }]
    wps.forEach((w) => {
      if (w.place) slots.push({ kind: 'wp', id: w.id })
    })
    slots.push({ kind: 'end' })

    const slot = slots[index]
    if (!slot) return null

    if (slot.kind === 'start') {
      setStartPlace(place)
      return getResolvedRouteStops(place, wps, end)
    }
    if (slot.kind === 'end') {
      setEndPlace(place)
      return getResolvedRouteStops(start, wps, place)
    }
    const nextDests = dests.map((d) => (d.id === slot.id ? { ...d, place } : d))
    setDestinations(nextDests)
    const nextWps = nextDests.slice(0, -1)
    const nextEnd = nextDests[nextDests.length - 1]?.place ?? null
    return getResolvedRouteStops(start, nextWps, nextEnd)
  }, [setEndPlace])

  const handleRouteStopDragEnd = useCallback(
    async ({ index, lat, lng, total }) => {
      if (!routeData || total < 2) return

      skipNextAutoCalcRef.current = true
      const stopsForRoute = applyDraggedStop(index, lat, lng)
      if (!stopsForRoute || stopsForRoute.length < 2) return

      setAlternativeRoutes(null)
      setSelectedRouteIndex(0)
      setIsRouteEdited(false)
      mapRef.current?.clearAlternativeRoutes?.()
      recalcWithStops(stopsForRoute)

      const name = await resolveDraggedPlaceName(lat, lng)
      const named = { lat, lng, name }
      skipNextAutoCalcRef.current = true

      if (index === 0) {
        setStartPlace(named)
      } else if (index === total - 1) {
        setEndPlace(named)
      } else {
        setDestinations((prev) => {
          const slots = [{ kind: 'start' }]
          prev.slice(0, -1).forEach((w) => {
            if (w.place) slots.push({ kind: 'wp', id: w.id })
          })
          slots.push({ kind: 'end' })
          const slot = slots[index]
          if (slot?.kind !== 'wp') return prev
          return prev.map((d) => (d.id === slot.id ? { ...d, place: named } : d))
        })
      }
    },
    [routeData, mapRef, recalcWithStops, resolveDraggedPlaceName, applyDraggedStop]
  )

  useEffect(() => {
    if (!mapRef?.current?.setRouteStopDragHandler) return undefined
    mapRef.current.setRouteStopDragHandler(handleRouteStopDragEnd)
    return () => {
      mapRef.current?.setRouteStopDragHandler?.(null)
    }
  }, [mapRef, handleRouteStopDragEnd])

  const searchFieldHandlersRef = useRef({})

  const handleSearchStateChange = useCallback(
    (fieldKey, onSelectPlace, getStopsAfterSelect) => {
      searchFieldHandlersRef.current[fieldKey] = { onSelectPlace, getStopsAfterSelect }

      return (state) => {
        if (!state?.isFocused) {
          setActiveSearch((prev) => (prev?.fieldKey === fieldKey ? null : prev))
          return
        }
        const openPanel = Boolean(state.openPanel)
        setActiveSearch((prev) => {
          if (
            prev?.fieldKey === fieldKey &&
            prev?.query === state.query &&
            prev?.results === state.results &&
            prev?.isSearching === state.isSearching &&
            prev?.openPanel === openPanel
          ) {
            return prev
          }
          const handlers = searchFieldHandlersRef.current[fieldKey]
          return {
            fieldKey,
            query: state.query,
            results: state.results,
            isSearching: state.isSearching,
            openPanel,
            onSelect: (result) => {
              const place = { lat: result.lat, lng: result.lng, name: result.displayName }
              handlers?.onSelectPlace?.(place)
              setActiveSearch(null)
              recalcWithStops(handlers?.getStopsAfterSelect?.(place))
            },
          }
        })
      }
    },
    [recalcWithStops]
  )

  const selectPlaceAndRecalc = useCallback(
    (setter, getStopsAfterSelect) => (place) => {
      setter(place)
      recalcWithStops(getStopsAfterSelect(place))
    },
    [recalcWithStops]
  )

  // Google Maps: auto-update route when any two+ resolved stops change
  useEffect(() => {
    if (resolvedRouteStops.length < 2) return undefined
    if (skipNextAutoCalcRef.current) {
      skipNextAutoCalcRef.current = false
      return undefined
    }
    if (autoCalcTimerRef.current) clearTimeout(autoCalcTimerRef.current)
    autoCalcTimerRef.current = setTimeout(() => {
      handleCalculate()
    }, 650)
    return () => {
      if (autoCalcTimerRef.current) clearTimeout(autoCalcTimerRef.current)
    }
  }, [resolvedStopsSignature, handleCalculate, resolvedRouteStops.length])

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
    setShowSteps(false)
    setAlternativeRoutes(null)
    setSelectedRouteIndex(0)
    if (mapRef?.current?.clearAlternativeRoutes) {
      mapRef.current.clearAlternativeRoutes()
    }
    const routeOpts = MODE_ROUTE_OPTIONS[mode] || {}
    if (allModesData?.[mode]) {
      setRouteData(allModesData[mode])
      setIsRouteEdited(false)
      if (allModesData[mode]?.geometry && mapRef?.current?.setRouteGeometry) {
        mapRef.current.setRouteGeometry(allModesData[mode].geometry, { fitBounds: false, ...routeOpts })
      }
      fetchAlternativesForCurrentTrip(mode)
    } else if (resolvedRouteStops.length >= 2) {
      handleCalculate(mode)
    }
  }

  const handleClear = () => {
    skipNextAutoCalcRef.current = true
    if (mapRef?.current?.clearRoute) {
      mapRef.current.clearRoute()
    }
    setRouteData(null)
    setIsRouteEdited(false)
    setAllModesData(null)
    setAlternativeRoutes(null)
    setSelectedRouteIndex(0)
    setShowSteps(false)
    setMobileSheetCollapsed(false)
    setError(null)
  }

  const handleStartNavigation = () => {
    if (!routeData || !onStartNavigation) return
    // Unlock TTS inside this tap so spoken prompts work on mobile browsers.
    getSpeechController().unlock()
    onStartNavigation({
      route: routeData,
      travelMode,
      destinationName: endPlace?.name || '',
      destination: endPlace,
      stops: resolvedRouteStops,
    })
  }

  const handleSwap = () => {
    const lastPlace = destinations[destinations.length - 1]?.place ?? null
    const reversedMiddle = [...destinations.slice(0, -1)].reverse()
    const lastId = destinations[destinations.length - 1].id
    setStartPlace(lastPlace)
    setDestinations([...reversedMiddle, { id: lastId, place: startPlace }])
  }

  const addDestination = () => {
    if (destinations.length >= 9) return // max 8 intermediate + 1 final destination
    setDestinations((prev) => [...prev, { id: nextWpId.current++, place: null }])
  }

  const removeDestination = (destId) => {
    setDestinations((prev) => {
      if (prev.length <= 1) return [{ ...prev[0], place: null }]
      return prev.filter((d) => d.id !== destId)
    })
  }

  const updateDestination = (destId, place) => {
    setDestinations((prev) => prev.map((d) => (d.id === destId ? { ...d, place } : d)))
  }

  const moveDestination = (index, direction) => {
    setDestinations((prev) => {
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
    if (!seconds || seconds < 60) return '< 1 min'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes} min`
  }

  const showMobileCollapsed = isMobileViewport && mobileSheetCollapsed && routeData

  // Build ordered list of all stops for display
  const allStops = [
    { key: 'start', type: 'start', place: startPlace },
    ...destinations.map((d, idx) => ({
      key: `dest-${d.id}`,
      type: idx === destinations.length - 1 ? 'end' : 'waypoint',
      destId: d.id,
      place: d.place,
    })),
  ]

  const modeEta = (modeId) => {
    if (isCalculating && travelMode === modeId) return '…'
    const d = allModesData?.[modeId]
    if (d?.duration) return formatModeEta(d.duration)
    return '—'
  }

  const stopRows = [
    {
      key: 'start',
      kind: 'start',
      place: startPlace,
      rawSetPlace: setStartPlace,
      setPlace: selectPlaceAndRecalc(setStartPlace, (place) =>
        getResolvedRouteStops(place, waypoints, endPlace)
      ),
      clear: () => setStartPlace(null),
      placeholder: tChooseStart,
      getStopsAfterSelect: (place) => getResolvedRouteStops(place, waypoints, endPlace),
    },
    ...destinations.map((d, idx) => {
      const isLast = idx === destinations.length - 1
      const nextDests = (place) =>
        destinations.map((dest) => (dest.id === d.id ? { ...dest, place } : dest))
      const nextWaypoints = (place) => nextDests(place).slice(0, -1)
      const nextEnd = (place) => nextDests(place)[nextDests(place).length - 1]?.place ?? null
      return {
        key: `dest-${d.id}`,
        kind: isLast ? 'end' : 'waypoint',
        destId: d.id,
        destIndex: idx,
        place: d.place,
        rawSetPlace: (p) => updateDestination(d.id, p),
        setPlace: selectPlaceAndRecalc(
          (p) => updateDestination(d.id, p),
          (place) => getResolvedRouteStops(startPlace, nextWaypoints(place), nextEnd(place))
        ),
        clear: () => updateDestination(d.id, null),
        placeholder: isLast ? tChooseDestination : `${tAddStopPrefix} ${idx + 1}`,
        getStopsAfterSelect: (place) =>
          getResolvedRouteStops(startPlace, nextWaypoints(place), nextEnd(place)),
      }
    }),
  ]

  return (
    <div
      className={`gmaps-directions shadow-2xl w-full overflow-hidden flex flex-col ${
        isMobileViewport
          ? 'rounded-t-2xl sm:rounded-none max-h-[min(62dvh,560px)]'
          : 'rounded-none h-full'
      } ${showMobileCollapsed ? 'max-h-none' : ''}`}
      style={isMobileViewport && !showMobileCollapsed ? { maxHeight: 'min(62dvh, 560px)' } : undefined}
    >
      {/* Mobile drag affordance */}
      {isMobileViewport && (
        <div className="flex shrink-0 justify-center pt-2 pb-0.5 sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-slate-300/90" />
        </div>
      )}

      {showMobileCollapsed ? (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">{tDirections}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span style={{ color: TRAVEL_MODES.find((m) => m.id === travelMode)?.color }}>
                  {TRAVEL_MODES.find((m) => m.id === travelMode)?.icon}
                </span>
                <span className="text-base font-bold text-[#1967d2]">
                  {formatModeEta(routeData.duration)}
                </span>
                <span className="text-sm text-slate-500">· {formatDistance(routeData.distance)}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {startPlace?.name || tYourLocation} → {endPlace?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={tClose}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div
            className="flex shrink-0 gap-2 border-t border-slate-100 px-4 py-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {onStartNavigation && (
              <button
                type="button"
                onClick={handleStartNavigation}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#1765cc]"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.5 2.5l17 9.5-17 9.5 2.5-9.5z" />
                </svg>
                {tStart}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileSheetCollapsed(false)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Steps
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              {tClear}
            </button>
          </div>
        </>
      ) : (
        <>
      {/* Toolbar: modes + close (Google Maps) */}
      <div className="gmaps-directions-toolbar flex-shrink-0">
        <button type="button" className="gmaps-directions-toolbar-menu" aria-label="Menu">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
        <div className="gmaps-mode-scroll">
          {TRAVEL_MODES.map((mode) => {
            const isActive = travelMode === mode.id
            const eta = modeEta(mode.id)
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleModeChange(mode.id)}
                className={`gmaps-mode-btn${isActive ? ' is-active' : ''}`}
                title={travelModeLabels[mode.id] || mode.label}
                disabled={isCalculating && !isActive}
              >
                <span style={isActive ? { color: '#1967d2' } : { color: '#5f6368' }}>{mode.icon}</span>
                <span className="gmaps-mode-eta">{eta}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={onClose} className="gmaps-directions-toolbar-close" aria-label={tClose}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain gmaps-directions-body pb-2">
        <div className={`gmaps-input-card${activeSearch?.openPanel ? ' has-suggestions' : ''}`}>
          <div className="gmaps-input-rail">
            {stopRows.map((row, i) => (
              <div key={`rail-${row.key}`} className="flex flex-col items-center w-full">
                <GmapsStopIcon kind={row.kind === 'end' ? 'end' : 'mid'} />
                {i < stopRows.length - 1 && <div className="gmaps-rail-line" />}
              </div>
            ))}
          </div>
          <div className="gmaps-input-fields">
            {stopRows.map((row) => (
              <div
                key={row.key}
                className={`gmaps-field-row relative${row.kind === 'waypoint' ? ' pr-14' : ''}${
                  activeSearch?.fieldKey === row.key ? ' is-focused' : ''
                }`}
              >
                <PlaceSearchInput
                  variant="directions"
                  fieldKey={row.key}
                  placeholder={row.placeholder}
                  value={row.place}
                  onSelect={row.setPlace}
                  onClear={row.clear}
                  onResultsChange={onSearchResultsChange}
                  onSearchStateChange={handleSearchStateChange(
                    row.key,
                    row.rawSetPlace,
                    row.getStopsAfterSelect
                  )}
                />
                {row.kind === 'waypoint' && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {row.destIndex > 0 && (
                      <button type="button" onClick={() => moveDestination(row.destIndex, -1)} className="p-1 text-[#5f6368]" title={tMoveUp}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                    )}
                    {row.destIndex < destinations.length - 1 && (
                      <button type="button" onClick={() => moveDestination(row.destIndex, 1)} className="p-1 text-[#5f6368]" title={tMoveDown}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    )}
                    <button type="button" onClick={() => removeDestination(row.destId)} className="p-1 text-[#5f6368] hover:text-[#d93025]" title={tRemoveStop}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="gmaps-swap-col">
            <button type="button" onClick={handleSwap} className="gmaps-swap-btn" title={tReverseRoute} aria-label={tSwap}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>
        </div>

        {activeSearch?.openPanel && (
          <GmapsSuggestionsPanel
            query={activeSearch.query}
            results={activeSearch.results}
            isSearching={activeSearch.isSearching}
            noPlacesFound={tNoPlacesFound}
            onSelect={activeSearch.onSelect}
          />
        )}

        {currentLocation && !startPlace && !activeSearch?.openPanel && (
          <button
            type="button"
            onClick={() => setStartPlace(currentLocation)}
            className="mx-4 mt-2 text-sm text-[#1a73e8] font-medium flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
            </svg>
            {tYourLocation}
          </button>
        )}

        <button
          type="button"
          onClick={addDestination}
          disabled={destinations.length >= 9 || activeSearch?.openPanel}
          className="gmaps-add-dest"
          style={activeSearch?.openPanel ? { visibility: 'hidden', height: 0, margin: 0, padding: 0 } : undefined}
        >
          <span className="gmaps-add-dest-icon">+</span>
          {tAddDestination}
        </button>

        {isCalculating && (
          <div className="mx-4 mt-2 flex items-center gap-2 text-sm text-[#5f6368]">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1a73e8] border-t-transparent" />
            {tCalculating}
          </div>
        )}

        {routeData && !isCalculating && (
          <div className="gmaps-route-chip">
            <div className="gmaps-route-chip-duration">{formatModeEta(routeData.duration)}</div>
            <div className="gmaps-route-chip-meta">
              {formatDistance(routeData.distance)}
              {waypoints.filter((w) => w.place).length > 0 && (
                <span> · {waypoints.filter((w) => w.place).length} stops</span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
          </div>
        )}

        {routeData && waypoints.filter((w) => w.place).length > 0 && (
          <p className="mt-3 text-[10px] text-slate-500 leading-snug px-0.5">{tAlternativesDirectOnly}</p>
        )}

        {/* Alternative route options */}
        {alternativeRoutes && alternativeRoutes.length > 1 && routeData && (
          <div className="mt-3 space-y-2">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-0.5">
              {tAlternativeRoutes} · {alternativeRoutes.length} {tRoutesAvailable}
            </div>
            {alternativeRoutes.map((altRoute, i) => {
              const isSelected = i === selectedRouteIndex
              const modeColor = TRAVEL_MODES.find((m) => m.id === travelMode)?.color || '#136AEC'
              const tags = altRoute.routeTags || []
              const showFastest = tags.includes('fastest') || (
                !tags.length && altRoute.duration <= Math.min(...alternativeRoutes.map((r) => r.duration))
              )
              const showShortest = tags.includes('shortest') || (
                !tags.length && altRoute.distance <= Math.min(...alternativeRoutes.map((r) => r.distance))
              )
              return (
                <button
                  key={`alt-${i}-${altRoute.routeIndex ?? i}`}
                  onClick={() => handleSelectRoute(i)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                  style={isSelected ? { borderColor: modeColor, backgroundColor: `${modeColor}08` } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSelected ? '' : 'opacity-40'}`}
                        style={{ backgroundColor: isSelected ? modeColor : '#9CA3AF' }}
                      />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase flex-shrink-0">
                        {tRouteLabel} {i + 1}
                      </span>
                      <span
                        className={`text-sm font-bold ${isSelected ? '' : 'text-slate-700'}`}
                        style={isSelected ? { color: modeColor } : {}}
                      >
                        {formatDuration(altRoute.duration)}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 font-medium truncate">{formatDistance(altRoute.distance)}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {showFastest && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          {getRouteTagLabel('fastest', () => tFastest) || tFastest}
                        </span>
                      )}
                      {showShortest && !showFastest && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {getRouteTagLabel('shortest', () => tShortest) || tShortest}
                        </span>
                      )}
                      {isSelected && (
                        <svg className="w-4 h-4" style={{ color: modeColor }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {isSelected && altRoute.steps?.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-slate-400 truncate">
                      via {altRoute.steps.filter((s) => s.name).map((s) => s.name).filter((n, idx, arr) => arr.indexOf(n) === idx).slice(0, 3).join(' → ')}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {routeData && isRouteEdited && (
          <p className="mx-4 mt-2 text-xs text-amber-700">Route adjusted on map</p>
        )}

        {routeData?.legs && routeData.legs.length > 1 && (
          <div className="mx-4 mt-3 border-t border-[#e8eaed] pt-2 space-y-1.5">
            {routeData.legs.map((leg, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-[#5f6368]">
                <span className="truncate mr-2">
                  {allStops[i]?.place?.name?.slice(0, 20) || `Leg ${i + 1}`}
                  {' → '}
                  {allStops[i + 1]?.place?.name?.slice(0, 20) || `Leg ${i + 2}`}
                </span>
                <span className="text-[#202124] font-medium whitespace-nowrap">
                  {formatDistance(leg.distance)} · {formatDuration(leg.duration)}
                </span>
              </div>
            ))}
          </div>
        )}

        {routeData?.steps && routeData.steps.length > 0 && (
          <div className="mx-4 mt-3 border-t border-[#e8eaed] pt-2">
            <button
              type="button"
              onClick={() => setShowSteps(!showSteps)}
              className="w-full flex items-center justify-between text-sm font-medium text-[#1a73e8] py-1"
            >
              <span>Step-by-step directions</span>
              <svg className={`w-5 h-5 transition-transform ${showSteps ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSteps && (
              <div className="mt-1 max-h-52 overflow-y-auto overscroll-contain">
                {routeData.steps.map((step, i) => {
                  const maneuver = step.maneuver || {}
                  const instruction = step.name || maneuver.instruction || `Step ${i + 1}`
                  const modifier = maneuver.modifier || maneuver.type || ''
                  return (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#f1f3f4] last:border-0">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#e8f0fe] flex items-center justify-center mt-0.5">
                        <StepIcon modifier={modifier} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#202124] leading-snug">
                          {modifier && <span className="font-medium capitalize">{modifier.replace(/-/g, ' ')} </span>}
                          {instruction ? <span>on {instruction}</span> : null}
                        </div>
                        {(step.distance > 0 || step.duration > 0) && (
                          <div className="text-xs text-[#5f6368] mt-0.5">
                            {step.distance > 0 && formatDistance(step.distance)}
                            {step.distance > 0 && step.duration > 0 && ' · '}
                            {step.duration > 0 && formatDuration(step.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {travelMode === 'bus' && routeData && (
          <p className="mx-4 mt-2 text-xs text-[#5f6368] leading-snug">{tBusHint}</p>
        )}
      </div>

      {routeData && (
        <div className="px-4 py-2 border-t border-[#e8eaed] flex-shrink-0 flex items-center gap-2">
          {onStartNavigation && (
            <button
              type="button"
              onClick={handleStartNavigation}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1765cc]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.5 2.5l17 9.5-17 9.5 2.5-9.5z" />
              </svg>
              {tStart}
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className={`py-2 text-sm font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg transition-colors ${onStartNavigation ? 'px-4' : 'w-full'}`}
          >
            {tClear}
          </button>
        </div>
      )}
        </>
      )}
    </div>
  )
}

export default RoutePanel

