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

  // Method selection state
  const [extractionMethod, setExtractionMethod] = useState('grid') // 'grid' or 'search'

  // Grid-based extraction states
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

  // Search-based extraction states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [selectedSearchPlaces, setSelectedSearchPlaces] = useState(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false)
  const [searchStatus, setSearchStatus] = useState('Enter a search query')
  const [searchBounds, setSearchBounds] = useState(null)

  // Search map refs
  const searchMapContainerRef = useRef(null)
  const searchMapInstanceRef = useRef(null)
  const searchMarkersRef = useRef([])
  const autocompleteServiceRef = useRef(null)
  const placesDetailServiceRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchSuggestDebounceRef = useRef(null)
  const searchBarContainerRef = useRef(null)
  const [searchSuggestOpen, setSearchSuggestOpen] = useState(false)

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

  // Initialize search map when switching to search method
  useEffect(() => {
    if (extractionMethod !== 'search' || !mapsLoaded || !searchMapContainerRef.current) return
    if (searchMapInstanceRef.current) return

    const searchMap = new window.google.maps.Map(searchMapContainerRef.current, {
      center: { lat: 20.5, lng: 78.5 },
      zoom: 10,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    })
    searchMapInstanceRef.current = searchMap
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
    placesDetailServiceRef.current = new window.google.maps.places.PlacesService(searchMap)

    const syncSearchBounds = () => {
      const b = searchMap.getBounds()
      if (b) setSearchBounds(b)
    }
    syncSearchBounds()
    const idleListener = searchMap.addListener('idle', syncSearchBounds)
    return () => {
      if (idleListener) window.google.maps.event.removeListener(idleListener)
    }
  }, [extractionMethod, mapsLoaded])

  // Clean up search markers on unmount
  useEffect(() => {
    return () => {
      searchMarkersRef.current.forEach((marker) => marker.setMap(null))
      searchMarkersRef.current = []
    }
  }, [])

  // --- Autocomplete suggestions (debounced, Maps-style structured lines) ---
  const fetchSearchSuggestions = useCallback(
    (input) => {
      const q = input.trim()
      if (!q || !autocompleteServiceRef.current) {
        setSearchSuggestions([])
        setIsSearchingSuggestions(false)
        return
      }

      setIsSearchingSuggestions(true)
      const request = {
        input: q,
        componentRestrictions: { country: 'in' },
        radius: 50000,
      }
      if (searchBounds) request.bounds = searchBounds

      autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
        setIsSearchingSuggestions(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
          setSearchSuggestions(predictions.slice(0, 8))
        } else {
          setSearchSuggestions([])
        }
      })
    },
    [searchBounds]
  )

  const handleSearchInputChange = useCallback((value) => {
    setSearchQuery(value)
    if (searchSuggestDebounceRef.current) clearTimeout(searchSuggestDebounceRef.current)
    const q = value.trim()
    if (!q) {
      setSearchSuggestions([])
      setIsSearchingSuggestions(false)
      setSearchSuggestOpen(false)
      return
    }
    searchSuggestDebounceRef.current = setTimeout(() => {
      fetchSearchSuggestions(value)
    }, 250)
  }, [fetchSearchSuggestions])

  useEffect(() => {
    return () => {
      if (searchSuggestDebounceRef.current) clearTimeout(searchSuggestDebounceRef.current)
    }
  }, [])

  useEffect(() => {
    const onDocDown = (e) => {
      if (!searchBarContainerRef.current?.contains(e.target)) setSearchSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  // --- Add marker to search map ---
  const addSearchMarker = useCallback((place) => {
    if (!searchMapInstanceRef.current) return

    const marker = new window.google.maps.Marker({
      map: searchMapInstanceRef.current,
      title: place.name,
      position: { lat: place.lat, lng: place.lng },
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    })

    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div class="text-sm font-medium">${place.name}</div>`,
    })

    marker.addListener('click', () => {
      searchMarkersRef.current.forEach((m) => {
        if (m.infoWindow) m.infoWindow.close()
      })
      infoWindow.open(searchMapInstanceRef.current, marker)
    })

    marker.infoWindow = infoWindow
    searchMarkersRef.current.push(marker)
    return marker
  }, [])

  // --- Handle suggestion selection ---
  const handleSuggestionSelect = useCallback(
    (placeId, description) => {
      if (!placesDetailServiceRef.current) return

      setIsSearching(true)
      placesDetailServiceRef.current.getDetails(
        {
          placeId,
          fields: ['formatted_address', 'geometry', 'name', 'place_id', 'types'],
        },
        (details, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
            const processedPlace = {
              name: details.name,
              lat: details.geometry.location.lat(),
              lng: details.geometry.location.lng(),
              address: details.formatted_address,
              placeId: details.place_id,
              type: details.types?.[0] || 'place',
            }

            // Add to results if not already there
            const exists = searchResults.some((p) => p.placeId === details.place_id)
            if (!exists) {
              setSearchResults((prev) => [...prev, processedPlace])
              setSelectedSearchPlaces((prev) => new Set([...prev, processedPlace.name]))

              // Add marker to map
              addSearchMarker(processedPlace)

              // Fit bounds to show all markers
              if (searchMapInstanceRef.current && searchMarkersRef.current.length > 0) {
                const bounds = new window.google.maps.LatLngBounds()
                searchMarkersRef.current.forEach((marker) => {
                  bounds.extend(marker.getPosition())
                })
                searchMapInstanceRef.current.fitBounds(bounds, 100)
              }

              setSearchStatus(`Added: ${processedPlace.name}`)
            } else {
              setSearchStatus('Place already added')
            }
          }
          setSearchQuery('')
          setSearchSuggestions([])
          setSearchSuggestOpen(false)
          setIsSearching(false)
        }
      )
    },
    [searchResults, addSearchMarker]
  )

  // --- Update marker appearance based on selection ---
  const updateSearchMarkers = useCallback(() => {
    searchMarkersRef.current.forEach((marker) => {
      const position = marker.getPosition()
      const isSelected = Array.from(selectedSearchPlaces).some(
        (name) =>
          searchResults.some(
            (p) => p.name === name && 
            Math.abs(p.lat - position.lat()) < 0.0001 && 
            Math.abs(p.lng - position.lng()) < 0.0001
          )
      )

      marker.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 10 : 8,
        fillColor: isSelected ? '#EF4444' : '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      })
    })
  }, [selectedSearchPlaces, searchResults])

  useEffect(() => {
    updateSearchMarkers()
  }, [selectedSearchPlaces, updateSearchMarkers])

  // --- Remove place from search results ---
  const removeSearchPlace = useCallback((placeId) => {
    const placeToRemove = searchResults.find((p) => p.placeId === placeId)
    if (!placeToRemove) return

    setSearchResults((prev) => prev.filter((p) => p.placeId !== placeId))
    setSelectedSearchPlaces((prev) => {
      const next = new Set(prev)
      next.delete(placeToRemove.name)
      return next
    })

    // Remove marker
    const markerToRemove = searchMarkersRef.current.find(
      (m) => Math.abs(m.getPosition().lat() - placeToRemove.lat) < 0.0001 &&
             Math.abs(m.getPosition().lng() - placeToRemove.lng) < 0.0001
    )
    if (markerToRemove) {
      markerToRemove.setMap(null)
      searchMarkersRef.current = searchMarkersRef.current.filter((m) => m !== markerToRemove)
    }
  }, [searchResults, addSearchMarker])

  const handleSearchAddToMap = useCallback(async () => {
    const selected = searchResults.filter((p) => selectedSearchPlaces.has(p.name))
    if (selected.length === 0) {
      setSearchStatus('No places selected. Select places to add.')
      return
    }
    setAddingToMap(true)
    try {
      await onAddToMap(selected)
      setSearchStatus(`Successfully added ${selected.length} places to the map!`)
      // Clear after successful add
      setTimeout(() => {
        setSearchQuery('')
        setSearchResults([])
        setSelectedSearchPlaces(new Set())
        setSearchSuggestions([])
        setSearchStatus('Enter a search query')
        setSearchSuggestOpen(false)
        // Clear markers
        searchMarkersRef.current.forEach((m) => m.setMap(null))
        searchMarkersRef.current = []
      }, 1500)
    } catch (err) {
      setSearchStatus(`Failed to add places: ${err.message}`)
    } finally {
      setAddingToMap(false)
    }
  }, [searchResults, selectedSearchPlaces, onAddToMap])

  const toggleSearchPlace = useCallback((name) => {
    setSelectedSearchPlaces((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 flex pointer-events-none items-end justify-center sm:items-center p-0 sm:p-4 md:p-6"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px] pointer-events-auto transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — mobile: bottom sheet; sm+: centered card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-extract-title"
        className="relative pointer-events-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.35rem] border border-slate-200/80 bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.18)] sm:rounded-2xl sm:border-slate-200 sm:shadow-2xl max-h-[min(100dvh,100svh)] sm:max-h-[min(90dvh,880px)] min-h-0 animate-sheet-up sm:animate-fade-in"
      >
        {/* Mobile drag affordance */}
        <div className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-slate-300/90" />
        </div>

        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-gradient-to-r from-primary-600 via-primary-600 to-cyan-600 px-4 py-3.5 sm:py-4 text-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_100%_0%,rgba(255,255,255,0.15),transparent_50%)]" aria-hidden />
          <div className="relative flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 id="place-extract-title" className="truncate text-base font-bold tracking-tight sm:text-lg">
                Place Extractor
              </h2>
              <p className="truncate text-xs text-white/80 sm:text-[13px]">Add many places from a region or search</p>
            </div>
            {extractionMethod === 'grid' && extractedPlaces.length > 0 && (
              <span className="hidden shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/25 sm:inline-flex">
                {extractedPlaces.length} found
              </span>
            )}
            {extractionMethod === 'search' && searchResults.length > 0 && (
              <span className="hidden shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/25 sm:inline-flex">
                {searchResults.length} results
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 active:bg-white/25 sm:h-10 sm:w-10"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Method tabs — segmented control */}
        <div className="shrink-0 border-b border-slate-200/80 bg-slate-50 px-3 py-2.5 sm:px-4">
          <div className="flex gap-1 rounded-xl bg-slate-200/60 p-1">
            <button
              type="button"
              onClick={() => setExtractionMethod('grid')}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-semibold transition-all sm:min-h-0 sm:py-2 ${
                extractionMethod === 'grid'
                  ? 'bg-white text-primary-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 4h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2z" />
              </svg>
              <span className="truncate">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setExtractionMethod('search')}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-semibold transition-all sm:min-h-0 sm:py-2 ${
                extractionMethod === 'search'
                  ? 'bg-white text-primary-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="truncate">Search</span>
            </button>
          </div>
          {((extractionMethod === 'grid' && extractedPlaces.length > 0) ||
            (extractionMethod === 'search' && searchResults.length > 0)) && (
            <p className="mt-2 text-center text-xs font-medium text-primary-600 sm:hidden">
              {extractionMethod === 'grid'
                ? `${extractedPlaces.length} places found`
                : `${searchResults.length} in list`}
            </p>
          )}
        </div>

        {mapsError ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 sm:p-10">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-100">
                <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-red-700">{mapsError}</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {/* ============== GRID SELECTION METHOD ============== */}
            {extractionMethod === 'grid' && (
              <>
                {/* Main column: controls + map */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  {/* Controls */}
                  <div className="max-h-[52vh] shrink-0 overflow-y-auto border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3 sm:max-h-none sm:p-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Region &amp; grid</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div className="flex min-w-0 gap-2">
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Country (e.g. India)"
                          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-primary-400/30 transition-shadow focus:border-primary-400 focus:ring-2"
                          onKeyDown={(e) => e.key === 'Enter' && loadLocation('country')}
                        />
                        <button
                          type="button"
                          onClick={() => loadLocation('country')}
                          className="min-h-[44px] shrink-0 rounded-xl bg-primary-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 active:bg-primary-800"
                        >
                          Load
                        </button>
                      </div>
                      <div className="flex min-w-0 gap-2">
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="State / region"
                          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-primary-400/30 transition-shadow focus:border-primary-400 focus:ring-2"
                          onKeyDown={(e) => e.key === 'Enter' && loadLocation('state')}
                        />
                        <button
                          type="button"
                          onClick={() => loadLocation('state')}
                          className="min-h-[44px] shrink-0 rounded-xl bg-primary-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 active:bg-primary-800"
                        >
                          Load
                        </button>
                      </div>
                      <div className="flex min-w-0 gap-2">
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="District"
                          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-primary-400/30 transition-shadow focus:border-primary-400 focus:ring-2"
                          onKeyDown={(e) => e.key === 'Enter' && loadLocation('district')}
                        />
                        <button
                          type="button"
                          onClick={() => loadLocation('district')}
                          className="min-h-[44px] shrink-0 rounded-xl bg-primary-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 active:bg-primary-800"
                        >
                          Load
                        </button>
                      </div>
                      <div className="flex min-w-0 gap-2">
                        <input
                          type="text"
                          value={taluk}
                          onChange={(e) => setTaluk(e.target.value)}
                          placeholder="Taluk / locality"
                          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-primary-400/30 transition-shadow focus:border-primary-400 focus:ring-2"
                          onKeyDown={(e) => e.key === 'Enter' && loadLocation('taluk')}
                        />
                        <button
                          type="button"
                          onClick={() => loadLocation('taluk')}
                          className="min-h-[44px] shrink-0 rounded-xl bg-primary-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 active:bg-primary-800"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <select
                        value={gridSize}
                        onChange={(e) => setGridSize(parseInt(e.target.value, 10))}
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-primary-400/20 focus:border-primary-400 focus:ring-2 sm:w-auto"
                      >
                        {GRID_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        {!isExtracting ? (
                          <button
                            type="button"
                            onClick={extractPlaces}
                            className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-600 sm:flex-none"
                          >
                            Extract places
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopExtraction}
                            className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 sm:flex-none"
                          >
                            Stop
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={downloadJSON}
                          disabled={extractedPlaces.length === 0}
                          className="min-h-[44px] rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="min-h-[44px] rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                        >
                          Upload
                        </button>
                      </div>
                      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleUploadJSON} />
                    </div>
                  </div>

                  {/* Status + Progress */}
                  <div className="shrink-0 border-b border-slate-100 bg-white px-3 py-2.5 sm:px-4">
                    <div className="flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 leading-snug sm:truncate">{status}</span>
                      <span className="shrink-0 text-[11px] text-slate-400 sm:text-xs">
                        API {apiStats.nearby + apiStats.geocode} · retries {apiStats.retries}
                      </span>
                    </div>
                    {isExtracting && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Google Map */}
                  <div ref={mapContainerRef} className="min-h-[220px] flex-1 bg-slate-100 sm:min-h-[280px]" />
                </div>

                {/* Places list */}
                <div className="flex max-h-[min(42vh,360px)] min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:max-h-none lg:w-80 lg:flex-shrink-0 lg:border-l lg:border-t-0 xl:w-96">
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-800">Extracted places</h3>
                      <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {selectedPlaces.size}/{extractedPlaces.length}
                      </span>
                    </div>
                    {extractedPlaces.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="shrink-0 text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        {selectAll ? 'Deselect all' : 'Select all'}
                      </button>
                    )}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {extractedPlaces.length === 0 ? (
                      <div className="flex h-full min-h-[120px] items-center justify-center p-4">
                        <p className="max-w-[220px] text-center text-xs leading-relaxed text-slate-500">
                          Load a region, run extract, then pick places to add to your map.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {extractedPlaces.map((place, idx) => (
                          <li
                            key={`${place.name}-${idx}`}
                            className={`flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors active:bg-slate-100 sm:py-2.5 ${
                              selectedPlaces.has(place.name) ? 'bg-primary-50/70' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => togglePlace(place.name)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPlaces.has(place.name)}
                              readOnly
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">{place.name}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                                {place.type && <span className="ml-1 text-slate-400">· {place.type}</span>}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {extractedPlaces.length > 0 && (
                    <div
                      className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4"
                      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                    >
                      <button
                        type="button"
                        onClick={handleAddToMap}
                        disabled={selectedPlaces.size === 0 || addingToMap}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-4 text-sm font-bold text-white shadow-lg transition hover:from-primary-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingToMap ? (
                          <>
                            <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Adding…
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">Add {selectedPlaces.size} to map</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ============== SEARCH-BASED METHOD ============== */}
            {extractionMethod === 'search' && (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Map */}
                <div className="order-2 flex min-h-0 min-w-0 flex-1 flex-col lg:order-1">
                  <div ref={searchMapContainerRef} className="min-h-[240px] flex-1 bg-slate-100 sm:min-h-[300px] lg:min-h-0" />
                </div>

                {/* Search panel */}
                <div className="order-1 flex max-h-[min(48vh,420px)] min-h-0 w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:order-2 lg:max-h-none lg:w-96 lg:flex-shrink-0 lg:border-b-0 lg:border-l">
                  <div className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4">
                    <h3 className="mb-2 text-sm font-semibold text-slate-800">Search places</h3>
                    <div ref={searchBarContainerRef} className="relative z-30">
                      <div className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-white pl-3 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-primary-400/35 focus-within:border-primary-400">
                        <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchInputChange(e.target.value)}
                          onFocus={() => {
                            setSearchSuggestOpen(true)
                            if (searchQuery.trim().length >= 2) fetchSearchSuggestions(searchQuery)
                          }}
                          placeholder="Search for a place…"
                          autoComplete="off"
                          className="min-h-[44px] min-w-0 flex-1 bg-transparent py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none sm:text-sm"
                        />
                        {isSearchingSuggestions && (
                          <svg className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </div>

                      {searchSuggestOpen &&
                        searchQuery.trim().length >= 2 &&
                        (searchSuggestions.length > 0 || isSearchingSuggestions) && (
                        <div
                          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
                          role="listbox"
                          aria-label="Place suggestions"
                        >
                          {isSearchingSuggestions && searchSuggestions.length === 0 && (
                            <div className="px-3 py-3 text-sm text-slate-500">Searching…</div>
                          )}
                          {searchSuggestions.map((suggestion) => {
                            const main =
                              suggestion.structured_formatting?.main_text ||
                              suggestion.description?.split(',')[0]?.trim() ||
                              suggestion.description
                            const secondary =
                              suggestion.structured_formatting?.secondary_text ||
                              (suggestion.description?.includes(',')
                                ? suggestion.description.slice(suggestion.description.indexOf(',') + 1).trim()
                                : '')
                            return (
                              <button
                                key={suggestion.place_id}
                                type="button"
                                role="option"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSuggestionSelect(suggestion.place_id, suggestion.description)}
                                className="w-full border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 active:bg-slate-100 sm:py-2.5"
                              >
                                <div className="flex items-start gap-2.5">
                                  <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{main}</p>
                                    {secondary ? (
                                      <p className="text-xs text-slate-500 truncate mt-0.5">{secondary}</p>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{searchStatus}</p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {searchResults.length === 0 ? (
                      <div className="flex h-full min-h-[100px] items-center justify-center p-6">
                        <div className="max-w-[200px] text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                            <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-500">Type above, pick a suggestion, then add to the map.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {searchResults.map((place) => (
                          <div
                            key={place.placeId}
                            className={`flex items-start gap-3 p-3 transition-colors active:bg-slate-100 sm:py-2.5 ${
                              selectedSearchPlaces.has(place.name) ? 'bg-primary-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSearchPlaces.has(place.name)}
                              onChange={() => toggleSearchPlace(place.name)}
                              className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-primary-600"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{place.name}</p>
                              <p className="line-clamp-2 text-xs text-slate-600 sm:line-clamp-1">{place.address}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSearchPlace(place.placeId)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Remove place"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div
                      className="shrink-0 space-y-2 border-t border-slate-100 bg-white p-3 sm:p-4"
                      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                    >
                      <div className="text-center text-xs font-medium text-slate-600">
                        {selectedSearchPlaces.size} of {searchResults.length} selected
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchAddToMap}
                        disabled={selectedSearchPlaces.size === 0 || addingToMap}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-4 text-sm font-bold text-white shadow-lg transition hover:from-primary-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
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
                            Add to Map
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlaceExtractPanel
