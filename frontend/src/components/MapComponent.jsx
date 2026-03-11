import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSocket } from '../contexts/SocketContext'
import api from '../services/api'
import { formatAddressSubtitle } from '../utils/formatAddress'

const CATEGORY_COLORS = {
  Restaurant: '#EF4444',
  Hospital: '#DC2626',
  Hotel: '#F59E0B',
  Parking: '#6366F1',
  Shop: '#8B5CF6',
  'Grocery Store': '#A855F7',
  School: '#3B82F6',
  Temple: '#F97316',
  Bank: '#059669',
  'Post Office': '#6366F1',
  'Bus Stop': '#0EA5E9',
  'Police Station': '#DC2626',
  'Petrol Pump': '#EAB308',
  'Tourist Place': '#EC4899',
  Transit: '#0EA5E9',
  Museum: '#14B8A6',
  Pharmacy: '#10B981',
  ATM: '#84CC16',
  Cinema: '#8B5CF6',
  Gym: '#EF4444',
  Salon: '#EC4899',
  Other: '#0284C7',
}

const ACCURACY_CIRCLE_SOURCE_ID = 'user-accuracy-circle-source'
const ACCURACY_CIRCLE_LAYER_ID = 'user-accuracy-circle-layer'

const createCircleGeoJson = (centerLng, centerLat, radiusMeters, points = 64) => {
  const coordinates = []
  const latRadians = (centerLat * Math.PI) / 180
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = 111320 * Math.cos(latRadians || 0)

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2
    const dx = Math.cos(angle) * radiusMeters
    const dy = Math.sin(angle) * radiusMeters
    const lng = centerLng + dx / metersPerDegreeLng
    const lat = centerLat + dy / metersPerDegreeLat
    coordinates.push([lng, lat])
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    properties: {},
  }
}

// Added places: display like native map labels (no colored dot, just text like OSM labels)
const createPlaceMarkerElement = (place) => {
  const label = document.createElement('div')
  label.className = 'place-label-marker'
  label.textContent = place.name
  label.style.fontSize = '13px'
  label.style.fontWeight = '500'
  label.style.color = '#2c3e50'
  label.style.fontFamily = 'system-ui, -apple-system, sans-serif'
  label.style.textShadow = '0 1px 1px #fff, 0 -1px 1px #fff, 1px 0 1px #fff, -1px 0 1px #fff'
  label.style.whiteSpace = 'nowrap'
  label.style.overflow = 'hidden'
  label.style.textOverflow = 'ellipsis'
  label.style.cursor = 'pointer'
  label.style.maxWidth = '140px'
  label.style.pointerEvents = 'auto'
  label.title = `${place.name} (${place.category})`
  return label
}

const createSearchResultMarkerElement = (place) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'search-result-marker-wrapper'
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.cursor = 'pointer'

  const dot = document.createElement('div')
  dot.style.width = '20px'
  dot.style.height = '20px'
  dot.style.borderRadius = '50%'
  dot.style.backgroundColor = '#EF4444'
  dot.style.border = '2px solid white'
  dot.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)'

  const label = document.createElement('div')
  label.textContent = place.displayName || place.name || 'Place'
  label.style.maxWidth = '140px'
  label.style.fontSize = '10px'
  label.style.fontWeight = '600'
  label.style.color = '#1e293b'
  label.style.background = 'rgba(255,255,255,0.95)'
  label.style.padding = '2px 6px'
  label.style.borderRadius = '4px'
  label.style.marginTop = '4px'
  label.style.textAlign = 'center'
  label.style.whiteSpace = 'nowrap'
  label.style.overflow = 'hidden'
  label.style.textOverflow = 'ellipsis'
  label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'

  wrapper.appendChild(dot)
  wrapper.appendChild(label)
  wrapper.title = place.displayName || place.name || ''
  return wrapper
}

const createRouteEndpointMarker = (place, isStart) => {
  const color = isStart ? '#2563EB' : '#EF4444' // blue for start, red for end
  const label = isStart ? 'Start' : 'End'
  const wrapper = document.createElement('div')
  wrapper.className = 'route-endpoint-marker'
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.cursor = 'pointer'

  const dot = document.createElement('div')
  dot.style.width = '28px'
  dot.style.height = '28px'
  dot.style.borderRadius = '50%'
  dot.style.backgroundColor = color
  dot.style.border = '3px solid white'
  dot.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'

  const labelEl = document.createElement('div')
  labelEl.textContent = place?.name || place?.displayName || label
  labelEl.style.maxWidth = '140px'
  labelEl.style.fontSize = '11px'
  labelEl.style.fontWeight = '700'
  labelEl.style.color = '#1e293b'
  labelEl.style.background = 'rgba(255,255,255,0.95)'
  labelEl.style.padding = '3px 8px'
  labelEl.style.borderRadius = '4px'
  labelEl.style.marginTop = '4px'
  labelEl.style.textAlign = 'center'
  labelEl.style.whiteSpace = 'nowrap'
  labelEl.style.overflow = 'hidden'
  labelEl.style.textOverflow = 'ellipsis'
  labelEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'

  wrapper.appendChild(dot)
  wrapper.appendChild(labelEl)
  wrapper.title = place?.name || place?.displayName || label
  return wrapper
}

const MapComponent = forwardRef(({ onLocationUpdate, onMapClick, addPlaceMode, places = [], searchResultPlaces = [], routeStartPlace = null, routeEndPlace = null }, ref) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const userCircleRef = useRef(null)
  const searchedMarkerRef = useRef(null)
  const searchResultMarkersRef = useRef({})
  const routeEndpointMarkersRef = useRef({})
  const vehicleMarkersRef = useRef({})
  const routeLayerRef = useRef(null)
  const watchIdRef = useRef(null)
  const lastValidLocationRef = useRef(null)
  const placeMarkersRef = useRef({})
  const { socket } = useSocket()

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapZoom, setMapZoom] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('acquiring') // 'acquiring', 'high', 'weak'
  const [currentLocation, setCurrentLocation] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [route, setRoute] = useState(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const tileserverUrl = import.meta.env.VITE_TILESERVER_URL || 'https://umnaapp.in'
    const indiaBounds = [
      [68.0, 6.0],
      [97.0, 37.0],
    ]

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [`${tileserverUrl.replace(/\/+$/, '')}/tiles/{z}/{x}/{y}.png`],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19,
            attribution: '© UMNAAPP',
          },
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [78.5, 20.5], // India center
      zoom: 4,
      minZoom: 3,
      maxBounds: indiaBounds,
      maxBoundsOptions: {
        padding: 20,
      },
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    map.on('load', () => {
      map.fitBounds(indiaBounds, {
        padding: 20,
        duration: 0,
      })
      setMapLoaded(true)
      setMapZoom(map.getZoom())
      console.log('✅ Map loaded')
    })

    map.on('zoom', () => setMapZoom(map.getZoom()))
    map.on('zoomend', () => setMapZoom(map.getZoom()))

    mapRef.current = map

    return () => {
      if (searchedMarkerRef.current) {
        searchedMarkerRef.current.remove()
        searchedMarkerRef.current = null
      }
      Object.values(searchResultMarkersRef.current).forEach((m) => m?.remove())
      searchResultMarkersRef.current = {}
      Object.values(routeEndpointMarkersRef.current).forEach((m) => m?.remove())
      routeEndpointMarkersRef.current = {}
      Object.values(placeMarkersRef.current).forEach((m) => m?.remove())
      placeMarkersRef.current = {}
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Map click for Add Place location selection
  useEffect(() => {
    if (!mapRef.current || !onMapClick) return

    const handleMapClick = (e) => {
      if (!addPlaceMode) return
      const { lng, lat } = e.lngLat
      const zoom = mapRef.current.getZoom()
      onMapClick({ latitude: lat, longitude: lng, zoomLevel: zoom })
    }

    mapRef.current.on('click', handleMapClick)
    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick)
      }
    }
  }, [addPlaceMode, onMapClick])

  // Place markers - appear when map zoom >= place.zoomLevel, disappear when zoomed out
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    const currentZoom = mapZoom ?? mapRef.current.getZoom()

    // Filter: show place only when current zoom >= place's zoomLevel (place saved at that zoom)
    const visiblePlaces = places.filter((place) => {
      const minZoom = place.zoomLevel != null ? Number(place.zoomLevel) : 0
      return currentZoom >= minZoom
    })

    // Remove all place markers and re-add only visible ones
    Object.values(placeMarkersRef.current).forEach((m) => m?.remove())
    placeMarkersRef.current = {}

    visiblePlaces.forEach((place) => {
      const popup = new maplibregl.Popup({ offset: 12 })
        .setHTML(
          `<div class="p-2 min-w-[120px]"><strong class="text-slate-800">${place.name}</strong><div class="text-xs text-slate-600 mt-1">${place.category}</div></div>`
        )
      const el = createPlaceMarkerElement(place)
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        offset: [0, 0],
      })
        .setLngLat([place.longitude, place.latitude])
        .setPopup(popup)
        .addTo(mapRef.current)
      placeMarkersRef.current[place.id] = marker
    })

    return () => {
      Object.values(placeMarkersRef.current).forEach((m) => m?.remove())
      placeMarkersRef.current = {}
    }
  }, [mapLoaded, places, mapZoom])

  // Search result markers (from umnaapp.in/search)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    Object.values(searchResultMarkersRef.current).forEach((m) => m?.remove())
    searchResultMarkersRef.current = {}

    searchResultPlaces.forEach((place) => {
      const key = place.placeId || `${place.lat}-${place.lng}`
      const addrSubtitle = place.address && typeof place.address === 'object'
        ? (formatAddressSubtitle(place.address) || [place.address.road, place.address.city, place.address.state].filter(Boolean).join(', '))
        : ''
      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
        `<div class="p-2 min-w-[140px]"><strong class="text-slate-800">${place.displayName || place.name || 'Place'}</strong>${addrSubtitle ? `<div class="text-xs text-slate-600 mt-1">${addrSubtitle}</div>` : ''}</div>`
      )
      const el = createSearchResultMarkerElement(place)
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'top',
        offset: [0, -10],
      })
        .setLngLat([place.lng, place.lat])
        .setPopup(popup)
        .addTo(mapRef.current)
      searchResultMarkersRef.current[key] = marker
    })

    // Fit map to show all search results when we have them
    if (searchResultPlaces.length > 1) {
      const bounds = searchResultPlaces.reduce(
        (b, p) => b.extend([p.lng, p.lat]),
        new maplibregl.LngLatBounds(
          [searchResultPlaces[0].lng, searchResultPlaces[0].lat],
          [searchResultPlaces[0].lng, searchResultPlaces[0].lat]
        )
      )
      mapRef.current.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 14 })
    }

    return () => {
      Object.values(searchResultMarkersRef.current).forEach((m) => m?.remove())
      searchResultMarkersRef.current = {}
    }
  }, [mapLoaded, searchResultPlaces])

  // Route start (blue) and end (red) markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    Object.values(routeEndpointMarkersRef.current).forEach((m) => m?.remove())
    routeEndpointMarkersRef.current = {}

    if (routeStartPlace?.lat != null && routeStartPlace?.lng != null) {
      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
        `<div class="p-2 min-w-[120px]"><strong class="text-blue-700">Start</strong><div class="text-xs text-slate-600">${routeStartPlace.name || 'Start Place'}</div></div>`
      )
      const el = createRouteEndpointMarker(routeStartPlace, true)
      const marker = new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -14] })
        .setLngLat([routeStartPlace.lng, routeStartPlace.lat])
        .setPopup(popup)
        .addTo(mapRef.current)
      routeEndpointMarkersRef.current.start = marker
    }

    if (routeEndPlace?.lat != null && routeEndPlace?.lng != null) {
      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
        `<div class="p-2 min-w-[120px]"><strong class="text-red-700">End</strong><div class="text-xs text-slate-600">${routeEndPlace.name || 'End Place'}</div></div>`
      )
      const el = createRouteEndpointMarker(routeEndPlace, false)
      const marker = new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -14] })
        .setLngLat([routeEndPlace.lng, routeEndPlace.lat])
        .setPopup(popup)
        .addTo(mapRef.current)
      routeEndpointMarkersRef.current.end = marker
    }

    return () => {
      Object.values(routeEndpointMarkersRef.current).forEach((m) => m?.remove())
      routeEndpointMarkersRef.current = {}
    }
  }, [mapLoaded, routeStartPlace, routeEndPlace])

  // GPS location tracking
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    }

    const handleLocationSuccess = (position) => {
      const { latitude, longitude, accuracy, speed, heading } = position.coords

      // Filter: Only accept high-accuracy readings (≤ 30m)
      if (accuracy > 30) {
        setGpsStatus('weak')
        if (lastValidLocationRef.current) {
          // Use last valid position
          updateUserLocation(lastValidLocationRef.current, false)
        }
        return
      }

      setGpsStatus(accuracy <= 15 ? 'high' : 'acquiring')
      setLocationError(null)

      const location = { lat: latitude, lng: longitude, accuracy, speed, heading }
      lastValidLocationRef.current = location
      updateUserLocation(location, true)

      if (onLocationUpdate) {
        onLocationUpdate(location)
      }
    }

    const handleLocationError = (error) => {
      console.error('Location error:', error)
      let message = 'Location access denied. Please enable location services.'
      if (error.code === error.POSITION_UNAVAILABLE) {
        message = 'Location information unavailable. Please check GPS settings.'
      } else if (error.code === error.TIMEOUT) {
        message = 'Location request timed out. Please try again.'
      }
      setLocationError(message)
      setGpsStatus('weak')
    }

    // Start watching position
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        options
      )
    } else {
      setLocationError('Geolocation is not supported by your browser.')
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [mapLoaded, onLocationUpdate])

  // Update user location marker
  const updateUserLocation = useCallback((location, isHighAccuracy) => {
    if (!mapRef.current) return

    const { lat, lng, accuracy } = location

    // Remove existing marker and circle
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
    }
    if (mapRef.current.getLayer(ACCURACY_CIRCLE_LAYER_ID)) {
      mapRef.current.removeLayer(ACCURACY_CIRCLE_LAYER_ID)
    }
    if (mapRef.current.getSource(ACCURACY_CIRCLE_SOURCE_ID)) {
      mapRef.current.removeSource(ACCURACY_CIRCLE_SOURCE_ID)
    }

    // Create marker
    const el = document.createElement('div')
    el.className = 'user-marker'
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#136AEC'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
    el.style.cursor = 'pointer'

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapRef.current)

    // Create accuracy circle
    if (accuracy) {
      const radius = Math.min(accuracy, 100) // Cap at 100m for display
      mapRef.current.addSource(ACCURACY_CIRCLE_SOURCE_ID, {
        type: 'geojson',
        data: createCircleGeoJson(lng, lat, radius),
      })
      mapRef.current.addLayer({
        id: ACCURACY_CIRCLE_LAYER_ID,
        type: 'fill',
        source: ACCURACY_CIRCLE_SOURCE_ID,
        paint: {
          'fill-color': '#136AEC',
          'fill-opacity': 0.2,
        },
      })
    }

    setCurrentLocation({ lat, lng, accuracy })
  }, [])

  // Vehicle tracking via WebSocket
  useEffect(() => {
    if (!socket) return

    // Request vehicle list
    socket.emit('vehicles:list')

    // Listen for vehicle list
    socket.on('vehicles:list', ({ vehicles }) => {
      setVehicles(vehicles)
      vehicles.forEach((vehicle) => {
        if (vehicle.locations && vehicle.locations.length > 0) {
          const location = vehicle.locations[0]
          updateVehicleMarker(vehicle.id, {
            lat: location.latitude,
            lng: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,
          })
        }
      })
    })

    // Listen for vehicle location updates
    socket.on('vehicle:location:update', ({ vehicleId, location }) => {
      updateVehicleMarker(vehicleId, {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
      })
    })

    return () => {
      socket.off('vehicles:list')
      socket.off('vehicle:location:update')
    }
  }, [socket])

  // Update vehicle marker
  const updateVehicleMarker = useCallback((vehicleId, location) => {
    if (!mapRef.current) return

    const { lat, lng, heading } = location

    // Remove existing marker
    if (vehicleMarkersRef.current[vehicleId]) {
      vehicleMarkersRef.current[vehicleId].remove()
    }

    // Create vehicle marker
    const el = document.createElement('div')
    el.className = 'vehicle-marker'
    el.style.width = '24px'
    el.style.height = '24px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#FF6B35'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
    el.style.cursor = 'pointer'
    if (heading !== null && heading !== undefined) {
      el.style.transform = `rotate(${heading}deg)`
    }

    vehicleMarkersRef.current[vehicleId] = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapRef.current)
  }, [])

  // Draw route on map
  const drawRoute = useCallback((routeData) => {
    if (!mapRef.current || !routeData.geometry) return

    // Remove existing route
    if (routeLayerRef.current) {
      mapRef.current.removeLayer('route')
      mapRef.current.removeSource('route')
    }

    // Add route source
    mapRef.current.addSource('route', {
      type: 'geojson',
      data: routeData.geometry,
    })

    // Add route layer
    mapRef.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#136AEC',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    })

    routeLayerRef.current = true

    // Fit map to route bounds
    const coordinates = routeData.geometry.coordinates
    if (coordinates.length > 0) {
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      )
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      })
    }
  }, [])

  // Expose methods via ref (for parent component)
  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    calculateRoute: async (start, end, waypoints = []) => {
      const params = {
        start: `${start.lat},${start.lng}`,
        end: `${end.lat},${end.lng}`,
        profile: 'driving',
      }
      if (waypoints.length > 0) {
        params.waypoints = waypoints.map((wp) => `${wp.lat},${wp.lng}`).join(';')
      }

      const response = await api.get('/map/route', { params })
      const routeData = response.data

      if (!routeData?.geometry) {
        throw new Error('No route geometry returned from route service')
      }

      drawRoute({ geometry: routeData.geometry })
      setRoute(routeData)

      return routeData
    },
    clearRoute: () => {
      if (routeLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer('route')
        mapRef.current.removeSource('route')
        routeLayerRef.current = null
        setRoute(null)
      }
    },
    flyTo: (options) => {
      if (mapRef.current) {
        mapRef.current.flyTo(options)
      }
    },
    showSearchedLocation: (location, options = {}) => {
      if (!mapRef.current || !location) return

      const markerElement = document.createElement('div')
      markerElement.style.width = '18px'
      markerElement.style.height = '18px'
      markerElement.style.borderRadius = '50%'
      markerElement.style.backgroundColor = '#EF4444'
      markerElement.style.border = '3px solid white'
      markerElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)'

      if (searchedMarkerRef.current) {
        searchedMarkerRef.current.remove()
      }

      searchedMarkerRef.current = new maplibregl.Marker({ element: markerElement })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setText(location.name || 'Searched Location')
        )
        .addTo(mapRef.current)

      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: options.zoom || 15,
        duration: options.duration || 1000,
      })
    },
  }), [drawRoute])

  return (
    <div className={`relative w-full h-full ${addPlaceMode ? 'cursor-crosshair' : ''}`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* GPS Status Indicator - bottom on mobile to avoid search overlap */}
      {mapLoaded && (
        <div className="absolute bottom-4 left-2 sm:top-4 sm:bottom-auto sm:left-4 glass rounded-lg p-2.5 sm:p-3 shadow-lg z-10 max-w-[calc(100vw-1rem)] sm:max-w-none mb-[env(safe-area-inset-bottom)] sm:mb-0">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                gpsStatus === 'high'
                  ? 'bg-green-500'
                  : gpsStatus === 'acquiring'
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              } animate-pulse`}
            />
            <span className="text-xs sm:text-sm font-medium text-slate-700">
              {gpsStatus === 'high'
                ? 'High Accuracy GPS'
                : gpsStatus === 'acquiring'
                ? 'Acquiring GPS...'
                : 'Weak GPS Signal'}
            </span>
          </div>
          {currentLocation && (
            <div className="mt-2 text-xs text-slate-600 font-mono">
              {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </div>
          )}
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div className="absolute top-20 left-2 right-2 sm:left-4 sm:right-auto glass rounded-lg p-3 shadow-lg z-10 max-w-[calc(100vw-1rem)] sm:max-w-sm">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Location Access</p>
              <p className="text-xs text-slate-600 mt-1">{locationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Count */}
      {vehicles.length > 0 && (
        <div className="absolute top-4 right-4 glass rounded-lg p-3 shadow-lg z-10">
          <div className="text-sm font-medium text-slate-700">
            Vehicles: {vehicles.length}
          </div>
        </div>
      )}
    </div>
  )
})

MapComponent.displayName = 'MapComponent'

export default MapComponent

