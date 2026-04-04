import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../services/api'

const GRID_OPTIONS = [
  { value: 5, label: 'High (5×5 grid)' },
  { value: 3, label: 'Medium (3×3 grid)' },
  { value: 2, label: 'Low (2×2 grid)' },
]

const RATE_CONFIG = {
  minDelayBetweenCalls: 350,
  cellDelay: 800,
  maxRetries: 5,
  baseRetryDelay: 2000,
}

let _googleMapsApiKey = null

async function fetchGoogleMapsApiKey() {
  if (_googleMapsApiKey) return _googleMapsApiKey
  const { data } = await api.get('/map/config')
  _googleMapsApiKey = data.googleMapsApiKey || ''
  return _googleMapsApiKey
}

function loadGoogleMapsScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve()
      return
    }
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(check)
          resolve()
        }
      }, 100)
      return
    }
    fetchGoogleMapsApiKey()
      .then((key) => {
        if (!key) {
          reject(new Error('Google Maps API key not configured on the server.'))
          return
        }
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geocoding`
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Google Maps API'))
        document.head.appendChild(script)
      })
      .catch(reject)
  })
}

const PlaceExtractPanel = ({ isOpen, onClose, onAddToMap }) => {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const serviceRef = useRef(null)
  const markersRef = useRef([])
  const gridRectsRef = useRef([])
  const requestQueueRef = useRef([])
  const isProcessingQueueRef = useRef(false)
  const lastApiCallTimeRef = useRef(0)
  const stopRequestedRef = useRef(false)

  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [mapsError, setMapsError] = useState(null)
  const [country, setCountry] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [taluk, setTaluk] = useState('')
  const [gridSize, setGridSize] = useState(3)
  const [status, setStatus] = useState('Enter a country to begin')
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractedPlaces, setExtractedPlaces] = useState([])
  const [selectedPlaces, setSelectedPlaces] = useState(new Set())
  const [apiStats, setApiStats] = useState({ nearby: 0, geocode: 0, retries: 0 })
  const [addingToMap, setAddingToMap] = useState(false)
  const [selectAll, setSelectAll] = useState(true)

  const boundsRef = useRef({ state: null, district: null, taluk: null })
  const placesArrayRef = useRef([])
  const currentLocationRef = useRef({ country: '', state: '', district: '', taluk: '' })

  // Ref-backed counter for API stats (avoids stale closure in callbacks)
  const statsRef = useRef({ nearby: 0, geocode: 0, retries: 0 })

  const updateStats = useCallback((type) => {
    if (type === 'nearby') statsRef.current.nearby++
    else if (type === 'geocode') statsRef.current.geocode++
    else if (type === 'retry') statsRef.current.retries++
    setApiStats({ ...statsRef.current })
  }, [])

  // Load Google Maps
  useEffect(() => {
    if (!isOpen) return
    loadGoogleMapsScript()
      .then(() => setMapsLoaded(true))
      .catch((err) => setMapsError(err.message))
  }, [isOpen])

  // Init map when loaded
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || mapInstanceRef.current) return
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 20.5, lng: 78.5 },
      zoom: 4,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    })
    mapInstanceRef.current = map
    serviceRef.current = new window.google.maps.places.PlacesService(map)
  }, [mapsLoaded])

  // Cleanup on unmount/close
  useEffect(() => {
    if (!isOpen) {
      stopRequestedRef.current = true
      requestQueueRef.current = []
    }
  }, [isOpen])

  // --- Throttled API queue ---
  const enqueueApiCall = useCallback((apiCallFn) => {
    return new Promise((resolve) => {
      requestQueueRef.current.push({ fn: apiCallFn, resolve })
      processQueue()
    })
  }, [])

  function processQueue() {
    if (isProcessingQueueRef.current || requestQueueRef.current.length === 0) return
    isProcessingQueueRef.current = true

    const now = Date.now()
    const timeSinceLast = now - lastApiCallTimeRef.current
    const waitTime = Math.max(0, RATE_CONFIG.minDelayBetweenCalls - timeSinceLast)

    setTimeout(() => {
      if (requestQueueRef.current.length === 0) {
        isProcessingQueueRef.current = false
        return
      }
      const item = requestQueueRef.current.shift()
      lastApiCallTimeRef.current = Date.now()
      item.fn((result) => {
        item.resolve(result)
        isProcessingQueueRef.current = false
        if (requestQueueRef.current.length > 0) processQueue()
      })
    }, waitTime)
  }

  // --- Throttled geocode ---
  const throttledGeocode = useCallback((address) => {
    return enqueueApiCall((done) => {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address }, (results, gStatus) => {
        updateStats('geocode')
        if (gStatus === 'OVER_QUERY_LIMIT') {
          updateStats('retry')
          setStatus('Rate limited on geocode. Waiting 3s...')
          setTimeout(() => {
            geocoder.geocode({ address }, (r2, s2) => {
              updateStats('geocode')
              done({ results: r2, status: s2 })
            })
          }, 3000)
        } else {
          done({ results, status: gStatus })
        }
      })
    })
  }, [enqueueApiCall, updateStats])

  // --- Throttled nearby search ---
  const throttledNearbySearch = useCallback((request, retryCount = 0) => {
    return enqueueApiCall((done) => {
      serviceRef.current.nearbySearch(request, (results, nStatus) => {
        updateStats('nearby')
        if (nStatus === window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
          if (retryCount < RATE_CONFIG.maxRetries) {
            updateStats('retry')
            const delay = RATE_CONFIG.baseRetryDelay * Math.pow(2, retryCount)
            setStatus(`Rate limited (attempt ${retryCount + 1}/${RATE_CONFIG.maxRetries}). Waiting ${delay / 1000}s...`)
            setTimeout(() => {
              done(null) // release lock
              throttledNearbySearch(request, retryCount + 1)
            }, delay)
          } else {
            done({ results: [], status: 'MAX_RETRIES_EXCEEDED' })
          }
        } else {
          done({ results: results || [], status: nStatus })
        }
      })
    })
  }, [enqueueApiCall, updateStats])

  // --- Location loaders ---
  const loadLocation = useCallback(async (type) => {
    const map = mapInstanceRef.current
    if (!map) return

    let address = ''
    if (type === 'country') {
      if (!country.trim()) return
      currentLocationRef.current = { country: country.trim(), state: '', district: '', taluk: '' }
      address = country.trim()
    } else if (type === 'state') {
      if (!currentLocationRef.current.country) { setStatus('Load a country first'); return }
      if (!state.trim()) return
      currentLocationRef.current.state = state.trim()
      currentLocationRef.current.district = ''
      currentLocationRef.current.taluk = ''
      address = `${state.trim()}, ${currentLocationRef.current.country}`
    } else if (type === 'district') {
      if (!currentLocationRef.current.state) { setStatus('Load a state first'); return }
      if (!district.trim()) return
      currentLocationRef.current.district = district.trim()
      currentLocationRef.current.taluk = ''
      address = `${district.trim()}, ${currentLocationRef.current.state}, ${currentLocationRef.current.country}`
    } else if (type === 'taluk') {
      if (!currentLocationRef.current.district) { setStatus('Load a district first'); return }
      if (!taluk.trim()) return
      currentLocationRef.current.taluk = taluk.trim()
      address = `${taluk.trim()}, ${currentLocationRef.current.district}, ${currentLocationRef.current.state}, ${currentLocationRef.current.country}`
    }

    const { results, status: gStatus } = await throttledGeocode(address)
    if (gStatus === 'OK' && results?.[0]) {
      const viewport = results[0].geometry.viewport
      map.fitBounds(viewport)
      if (type === 'state') boundsRef.current.state = viewport
      else if (type === 'district') boundsRef.current.district = viewport
      else if (type === 'taluk') boundsRef.current.taluk = viewport
      setStatus(`Loaded ${address}. Ready to extract places.`)
    } else {
      setStatus(`Could not find "${address}"`)
    }
  }, [country, state, district, taluk, throttledGeocode])

  const getLocationString = () => {
    const loc = currentLocationRef.current
    return [loc.taluk, loc.district, loc.state, loc.country].filter(Boolean).join(', ')
  }

  // --- Grid generation ---
  const generateGrid = useCallback((bounds) => {
    const map = mapInstanceRef.current
    const NE = bounds.getNorthEast()
    const SW = bounds.getSouthWest()
    const latDiff = NE.lat() - SW.lat()
    const lngDiff = NE.lng() - SW.lng()
    const cells = []

    gridRectsRef.current.forEach((r) => r.setMap(null))
    gridRectsRef.current = []

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const cellSW = { lat: SW.lat() + (latDiff * i / gridSize), lng: SW.lng() + (lngDiff * j / gridSize) }
        const cellNE = { lat: SW.lat() + (latDiff * (i + 1) / gridSize), lng: SW.lng() + (lngDiff * (j + 1) / gridSize) }
        const cellBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(cellSW.lat, cellSW.lng),
          new window.google.maps.LatLng(cellNE.lat, cellNE.lng)
        )
        cells.push(cellBounds)
        const rect = new window.google.maps.Rectangle({
          bounds: cellBounds, map, strokeColor: '#FF0000', strokeOpacity: 0.8, strokeWeight: 1, fillColor: '#FF0000', fillOpacity: 0.1,
        })
        gridRectsRef.current.push(rect)
      }
    }
    return cells
  }, [gridSize])

  // --- Extraction ---
  const extractPlaces = useCallback(async () => {
    const extractionBounds = boundsRef.current.taluk || boundsRef.current.district || boundsRef.current.state
    if (!extractionBounds) {
      setStatus('Load at least a state before extracting.')
      return
    }
    if (isExtracting) return

    // Reset
    placesArrayRef.current = []
    setExtractedPlaces([])
    setSelectedPlaces(new Set())
    setSelectAll(true)
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    statsRef.current = { nearby: 0, geocode: 0, retries: 0 }
    setApiStats({ nearby: 0, geocode: 0, retries: 0 })
    stopRequestedRef.current = false
    setIsExtracting(true)
    setProgress(0)

    const grid = generateGrid(extractionBounds)
    const placeTypes = ['establishment', 'locality', 'sublocality', 'neighborhood']

    for (let cellIdx = 0; cellIdx < grid.length; cellIdx++) {
      if (stopRequestedRef.current) break

      const pct = Math.floor((cellIdx / grid.length) * 100)
      setProgress(pct)
      setStatus(`Extracting... Cell ${cellIdx + 1}/${grid.length} | Found: ${placesArrayRef.current.length} places`)

      // Highlight current cell
      if (cellIdx > 0 && gridRectsRef.current[cellIdx - 1]) {
        gridRectsRef.current[cellIdx - 1].setOptions({ fillColor: '#4285F4', fillOpacity: 0.15 })
      }
      if (gridRectsRef.current[cellIdx]) {
        gridRectsRef.current[cellIdx].setOptions({ fillColor: '#00FF00', fillOpacity: 0.3 })
      }

      for (const placeType of placeTypes) {
        if (stopRequestedRef.current) break
        const result = await throttledNearbySearch({ bounds: grid[cellIdx], type: placeType })
        if (result?.results && result.status === window.google.maps.places.PlacesServiceStatus.OK) {
          const newPlaces = []
          result.results.forEach((place) => {
            const name = place.name
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            // Deduplicate by name
            const exists = placesArrayRef.current.some((p) => p.name === name)
            if (!exists) {
              const newPlace = {
                name,
                lat,
                lng,
                type: place.types?.[0] || placeType,
                district: currentLocationRef.current.district,
                taluk: currentLocationRef.current.taluk,
                state: currentLocationRef.current.state,
                country: currentLocationRef.current.country,
              }
              placesArrayRef.current.push(newPlace)
              newPlaces.push(newPlace)

              const marker = new window.google.maps.Marker({
                position: place.geometry.location,
                map: mapInstanceRef.current,
                title: name,
              })
              markersRef.current.push(marker)
            }
          })
          if (newPlaces.length > 0) {
            setExtractedPlaces([...placesArrayRef.current])
            // Auto-select new places
            setSelectedPlaces((prev) => {
              const next = new Set(prev)
              newPlaces.forEach((p) => next.add(p.name))
              return next
            })
          }
        }
      }

      // Delay between cells
      if (!stopRequestedRef.current) {
        await new Promise((r) => setTimeout(r, RATE_CONFIG.cellDelay))
      }
    }

    setIsExtracting(false)
    setProgress(100)
    setStatus(`Extraction complete. Found ${placesArrayRef.current.length} places in ${getLocationString()}.`)
  }, [generateGrid, throttledNearbySearch, isExtracting])

  const stopExtraction = useCallback(() => {
    stopRequestedRef.current = true
    requestQueueRef.current = []
    setStatus(`Stopping... Found ${placesArrayRef.current.length} places so far.`)
  }, [])

  // --- Select/Deselect ---
  const toggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedPlaces(new Set())
    } else {
      setSelectedPlaces(new Set(extractedPlaces.map((p) => p.name)))
    }
    setSelectAll(!selectAll)
  }, [selectAll, extractedPlaces])

  const togglePlace = useCallback((name) => {
    setSelectedPlaces((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  // --- Add to map ---
  const handleAddToMap = useCallback(async () => {
    const selected = extractedPlaces.filter((p) => selectedPlaces.has(p.name))
    if (selected.length === 0) {
      setStatus('No places selected. Select places to add.')
      return
    }
    setAddingToMap(true)
    try {
      await onAddToMap(selected)
      setStatus(`Successfully added ${selected.length} places to the map!`)
    } catch (err) {
      setStatus(`Failed to add places: ${err.message}`)
    } finally {
      setAddingToMap(false)
    }
  }, [extractedPlaces, selectedPlaces, onAddToMap])

  // --- Download JSON ---
  const downloadJSON = useCallback(() => {
    if (extractedPlaces.length === 0) return
    const blob = new Blob([JSON.stringify(extractedPlaces, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${getLocationString().replace(/,\s+/g, '_') || 'places'}_extracted.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }, [extractedPlaces])

  // --- Upload JSON ---
  const fileInputRef = useRef(null)
  const handleUploadJSON = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const items = Array.isArray(data) ? data : []
        const valid = items.filter((p) => p.name && typeof p.lat === 'number' && typeof p.lng === 'number')
        if (valid.length === 0) {
          setStatus('No valid places found in the uploaded file.')
          return
        }
        // Deduplicate against existing
        const existingNames = new Set(placesArrayRef.current.map((p) => p.name))
        const newPlaces = valid.filter((p) => !existingNames.has(p.name))
        placesArrayRef.current = [...placesArrayRef.current, ...newPlaces]
        setExtractedPlaces([...placesArrayRef.current])
        const names = new Set([...selectedPlaces, ...newPlaces.map((p) => p.name)])
        setSelectedPlaces(names)
        setStatus(`Uploaded ${newPlaces.length} new places (${valid.length - newPlaces.length} duplicates skipped).`)
      } catch {
        setStatus('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [selectedPlaces])

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-40 flex pointer-events-none" style={{ top: 0 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

      {/* Panel */}
      <div className="relative pointer-events-auto w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col animate-fade-in mx-auto" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h2 className="text-base font-bold text-slate-800">Place Extractor</h2>
            {extractedPlaces.length > 0 && (
              <span className="text-xs font-medium bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">
                {extractedPlaces.length} found
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mapsError ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-red-600 font-medium">{mapsError}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Map + Controls */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Controls */}
              <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-2 flex-shrink-0 overflow-y-auto max-h-56">
                {/* Row 1: Country + State */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (e.g. India)"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && loadLocation('country')} />
                    <button onClick={() => loadLocation('country')} className="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">
                      Load
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State/Region"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && loadLocation('state')} />
                    <button onClick={() => loadLocation('state')} className="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">
                      Load
                    </button>
                  </div>
                </div>
                {/* Row 2: District + Taluk */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && loadLocation('district')} />
                    <button onClick={() => loadLocation('district')} className="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">
                      Load
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <input type="text" value={taluk} onChange={(e) => setTaluk(e.target.value)} placeholder="Taluk/Locality"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && loadLocation('taluk')} />
                    <button onClick={() => loadLocation('taluk')} className="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">
                      Load
                    </button>
                  </div>
                </div>
                {/* Row 3: Grid + Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <select value={gridSize} onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-400 outline-none">
                    {GRID_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!isExtracting ? (
                    <button onClick={extractPlaces} className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Extract Places
                    </button>
                  ) : (
                    <button onClick={stopExtraction} className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                      Stop
                    </button>
                  )}
                  <button onClick={downloadJSON} disabled={extractedPlaces.length === 0}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Download JSON
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                    Upload JSON
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleUploadJSON} />
                </div>
              </div>

              {/* Status + Progress */}
              <div className="px-3 py-2 text-xs text-slate-600 bg-white border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">{status}</span>
                  <span className="text-slate-400 ml-2 whitespace-nowrap">
                    API: {apiStats.nearby + apiStats.geocode} | Retries: {apiStats.retries}
                  </span>
                </div>
                {isExtracting && (
                  <div className="mt-1 w-full bg-slate-200 rounded-full h-1.5">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>

              {/* Google Map */}
              <div ref={mapContainerRef} className="flex-1 min-h-[200px]" />
            </div>

            {/* Right: Places List */}
            <div className="w-full lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 bg-white max-h-[40vh] lg:max-h-full">
              {/* List header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">Extracted Places</h3>
                  <span className="text-xs text-slate-400">{selectedPlaces.size}/{extractedPlaces.length}</span>
                </div>
                {extractedPlaces.length > 0 && (
                  <button onClick={toggleSelectAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    {selectAll ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Places scrollable list */}
              <div className="flex-1 overflow-y-auto">
                {extractedPlaces.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <p className="text-xs text-slate-400 text-center">No places extracted yet. Use the controls above to extract places from a region.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {extractedPlaces.map((place, idx) => (
                      <li key={`${place.name}-${idx}`}
                        className={`flex items-start gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors ${selectedPlaces.has(place.name) ? 'bg-primary-50/50' : ''}`}
                        onClick={() => togglePlace(place.name)}>
                        <input type="checkbox" checked={selectedPlaces.has(place.name)} readOnly
                          className="mt-1 w-3.5 h-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 truncate">{place.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {place.lat.toFixed(6)}, {place.lng.toFixed(6)}
                            {place.type && <span className="ml-1 text-slate-300">· {place.type}</span>}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add to Map button */}
              {extractedPlaces.length > 0 && (
                <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
                  <button onClick={handleAddToMap}
                    disabled={selectedPlaces.size === 0 || addingToMap}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {addingToMap ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Add {selectedPlaces.size} Extracted Places to Map
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlaceExtractPanel
