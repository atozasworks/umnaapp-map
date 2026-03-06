import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSocket } from '../contexts/SocketContext'
import api from '../services/api'

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

const createPlaceMarkerElement = (place) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'place-marker-wrapper'
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.cursor = 'pointer'

  const dot = document.createElement('div')
  const color = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.Other
  dot.className = 'place-marker'
  dot.style.width = '24px'
  dot.style.height = '24px'
  dot.style.borderRadius = '50%'
  dot.style.backgroundColor = color
  dot.style.border = '3px solid white'
  dot.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)'
  dot.style.flexShrink = '0'

  const label = document.createElement('div')
  label.textContent = place.name
  label.style.maxWidth = '120px'
  label.style.fontSize = '11px'
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
  wrapper.title = place.name
  return wrapper
}

const MapComponent = forwardRef(({ onLocationUpdate, onMapClick, addPlaceMode, places = [] }, ref) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const userCircleRef = useRef(null)
  const searchedMarkerRef = useRef(null)
  const vehicleMarkersRef = useRef({})
  const routeLayerRef = useRef(null)
  const watchIdRef = useRef(null)
  const lastValidLocationRef = useRef(null)
  const placeMarkersRef = useRef({})
  const { socket } = useSocket()

  const [mapLoaded, setMapLoaded] = useState(false)
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
      console.log('✅ Map loaded')
    })

    mapRef.current = map

    return () => {
      if (searchedMarkerRef.current) {
        searchedMarkerRef.current.remove()
        searchedMarkerRef.current = null
      }
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

  // Place markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    Object.values(placeMarkersRef.current).forEach((m) => m?.remove())
    placeMarkersRef.current = {}

    places.forEach((place) => {
      const popup = new maplibregl.Popup({ offset: 20 })
        .setHTML(
          `<div class="p-2 min-w-[120px]"><strong class="text-slate-800">${place.name}</strong><div class="text-xs text-slate-600 mt-1">${place.category}</div></div>`
        )
      const el = createPlaceMarkerElement(place)
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'top',
        offset: [0, -12],
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
  }, [mapLoaded, places])

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
    if (userCircleRef.current) {
      userCircleRef.current.remove()
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
      userCircleRef.current = new maplibregl.Circle({
        center: [lng, lat],
        radius: radius,
        style: {
          fillColor: '#136AEC',
          fillOpacity: 0.2,
          strokeColor: '#136AEC',
          strokeOpacity: 0.5,
          strokeWidth: 1,
        },
      }).addTo(mapRef.current)
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

      {/* GPS Status Indicator */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 glass rounded-lg p-3 shadow-lg z-10">
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
            <span className="text-sm font-medium text-slate-700">
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
        <div className="absolute top-20 left-4 glass rounded-lg p-3 shadow-lg z-10 max-w-sm">
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

