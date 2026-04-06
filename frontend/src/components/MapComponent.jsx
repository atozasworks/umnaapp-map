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
const PLACE_SOURCE_ID = 'user-places-source'
const PLACE_CLUSTER_LAYER_ID = 'user-places-clusters'
const PLACE_CLUSTER_COUNT_LAYER_ID = 'user-places-cluster-count'
const PLACE_POINT_LAYER_ID = 'user-places-point'
const PLACE_LABEL_LAYER_ID = 'user-places-label'

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

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

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
  dot.style.backgroundColor = place.markerColor || '#EA4335'
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

const MapComponent = forwardRef(({
  onLocationUpdate,
  onMapClick,
  onMapReady,
  addPlaceMode,
  places = [],
  searchResultPlaces = [],
  autoFitSearchResults = true,
  routeStartPlace = null,
  routeEndPlace = null,
}, ref) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const userCircleRef = useRef(null)
  const searchedMarkerRef = useRef(null)
  const searchResultMarkersRef = useRef({})
  const routeEndpointMarkersRef = useRef({})
  const vehicleMarkersRef = useRef({})
  const routeLayerRef = useRef(null)
  const routeGeoJsonRef = useRef(null)
  const routeEditStateRef = useRef(null)
  const routeEditListenersBoundRef = useRef(false)
  const routeEditHandlerRef = useRef(null)
  const routeDragRafRef = useRef(null)
  const routeEditEmitRafRef = useRef(null)
  const watchIdRef = useRef(null)
  const lastValidLocationRef = useRef(null)
  const hasFlownToUserRef = useRef(false)
  const lastAppliedAccuracyRef = useRef(null)
  const initialFlyFallbackTimerRef = useRef(null)
  const hasRefinedFlyToGpsRef = useRef(false)
  const placePopupRef = useRef(null)
  const { socket } = useSocket()

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapZoom, setMapZoom] = useState(null)
  const [mapInitError, setMapInitError] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('acquiring') // 'acquiring', 'high', 'weak'
  const [currentLocation, setCurrentLocation] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [route, setRoute] = useState(null)

  const toFeatureGeometry = useCallback((routeInput) => {
    if (!routeInput) return null

    const geometry = routeInput.type === 'Feature'
      ? routeInput.geometry
      : routeInput.geometry || routeInput

    if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
      return null
    }

    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: geometry.coordinates.map(([lng, lat]) => [lng, lat]),
      },
    }
  }, [])

  const haversineDistanceMeters = useCallback((a, b) => {
    const R = 6371000
    const toRad = (deg) => (deg * Math.PI) / 180
    const dLat = toRad(b[1] - a[1])
    const dLng = toRad(b[0] - a[0])
    const lat1 = toRad(a[1])
    const lat2 = toRad(b[1])
    const sinDLat = Math.sin(dLat / 2)
    const sinDLng = Math.sin(dLng / 2)
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
    return 2 * R * Math.asin(Math.sqrt(h))
  }, [])

  const getLineDistanceMeters = useCallback((coords) => {
    if (!Array.isArray(coords) || coords.length < 2) return 0
    let total = 0
    for (let i = 1; i < coords.length; i += 1) {
      total += haversineDistanceMeters(coords[i - 1], coords[i])
    }
    return total
  }, [haversineDistanceMeters])

  const emitRouteEdited = useCallback((coords) => {
    if (!routeEditHandlerRef.current) return
    routeEditHandlerRef.current({
      geometry: {
        type: 'LineString',
        coordinates: coords.map(([lng, lat]) => [lng, lat]),
      },
      distance: getLineDistanceMeters(coords),
      edited: true,
    })
  }, [getLineDistanceMeters])

  const scheduleRouteSourceUpdate = useCallback((coords, emitUpdate = true) => {
    if (!mapRef.current) return

    const feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords.map(([lng, lat]) => [lng, lat]),
      },
    }

    routeGeoJsonRef.current = feature

    if (routeDragRafRef.current) return
    routeDragRafRef.current = window.requestAnimationFrame(() => {
      routeDragRafRef.current = null
      const source = mapRef.current?.getSource('route')
      if (source) {
        source.setData(routeGeoJsonRef.current)
      }

      if (emitUpdate) {
        if (routeEditEmitRafRef.current) return
        routeEditEmitRafRef.current = window.requestAnimationFrame(() => {
          routeEditEmitRafRef.current = null
          const latestCoords = routeGeoJsonRef.current?.geometry?.coordinates || []
          emitRouteEdited(latestCoords)
        })
      }
    })
  }, [emitRouteEdited])

  const findNearestPointOnSegment = useCallback((px, py, ax, ay, bx, by) => {
    const dx = bx - ax
    const dy = by - ay
    const denom = dx * dx + dy * dy
    if (denom === 0) {
      return { x: ax, y: ay, t: 0, dist: Math.hypot(px - ax, py - ay) }
    }
    const tRaw = ((px - ax) * dx + (py - ay) * dy) / denom
    const t = Math.max(0, Math.min(1, tRaw))
    const x = ax + t * dx
    const y = ay + t * dy
    return { x, y, t, dist: Math.hypot(px - x, py - y) }
  }, [])

  const pickRouteInsertPoint = useCallback((lngLat) => {
    const map = mapRef.current
    const coords = routeGeoJsonRef.current?.geometry?.coordinates
    if (!map || !coords || coords.length < 2) return null

    const p = map.project([lngLat.lng, lngLat.lat])
    let best = null

    for (let i = 0; i < coords.length - 1; i += 1) {
      const a = map.project(coords[i])
      const b = map.project(coords[i + 1])
      const nearest = findNearestPointOnSegment(p.x, p.y, a.x, a.y, b.x, b.y)
      if (!best || nearest.dist < best.dist) {
        best = { ...nearest, segmentIndex: i }
      }
    }

    if (!best || best.dist > 22) return null
    const lngLatPoint = map.unproject([best.x, best.y])
    return {
      segmentIndex: best.segmentIndex,
      coord: [lngLatPoint.lng, lngLatPoint.lat],
    }
  }, [findNearestPointOnSegment])

  const onRouteDragMove = useCallback((e) => {
    const state = routeEditStateRef.current
    if (!state?.dragging) return

    const lngLat = e.lngLat
    if (!lngLat) return

    const coords = routeGeoJsonRef.current?.geometry?.coordinates
    if (!coords || state.coordIndex < 0 || state.coordIndex >= coords.length) return

    coords[state.coordIndex] = [lngLat.lng, lngLat.lat]
    scheduleRouteSourceUpdate(coords, true)
  }, [scheduleRouteSourceUpdate])

  const onRouteDragEnd = useCallback(() => {
    const state = routeEditStateRef.current
    if (!state?.dragging) return

    routeEditStateRef.current = null
    if (mapRef.current?.dragPan) {
      mapRef.current.dragPan.enable()
    }
    if (mapRef.current?.getCanvas) {
      mapRef.current.getCanvas().style.cursor = ''
    }

    const coords = routeGeoJsonRef.current?.geometry?.coordinates || []
    emitRouteEdited(coords)
  }, [emitRouteEdited])

  const bindRouteEditListeners = useCallback(() => {
    const map = mapRef.current
    if (!map || routeEditListenersBoundRef.current) return

    map.on('mouseenter', 'route-hit', () => {
      if (!routeEditStateRef.current?.dragging) {
        map.getCanvas().style.cursor = 'grab'
      }
    })

    map.on('mouseleave', 'route-hit', () => {
      if (!routeEditStateRef.current?.dragging) {
        map.getCanvas().style.cursor = ''
      }
    })

    const startDrag = (e) => {
      const target = pickRouteInsertPoint(e.lngLat)
      if (!target) return

      const coords = routeGeoJsonRef.current?.geometry?.coordinates
      if (!coords) return

      const insertIndex = target.segmentIndex + 1
      coords.splice(insertIndex, 0, target.coord)
      scheduleRouteSourceUpdate(coords, true)

      routeEditStateRef.current = {
        dragging: true,
        coordIndex: insertIndex,
      }

      if (map.dragPan) {
        map.dragPan.disable()
      }
      map.getCanvas().style.cursor = 'grabbing'
    }

    map.on('mousedown', 'route-hit', startDrag)
    map.on('touchstart', 'route-hit', startDrag)
    map.on('mousemove', onRouteDragMove)
    map.on('touchmove', onRouteDragMove)
    map.on('mouseup', onRouteDragEnd)
    map.on('touchend', onRouteDragEnd)
    map.on('touchcancel', onRouteDragEnd)

    routeEditListenersBoundRef.current = true
  }, [onRouteDragEnd, onRouteDragMove, pickRouteInsertPoint, scheduleRouteSourceUpdate])

  const unbindRouteEditListeners = useCallback(() => {
    const map = mapRef.current
    if (!map || !routeEditListenersBoundRef.current) return

    map.off('mousemove', onRouteDragMove)
    map.off('touchmove', onRouteDragMove)
    map.off('mouseup', onRouteDragEnd)
    map.off('touchend', onRouteDragEnd)
    map.off('touchcancel', onRouteDragEnd)

    routeEditListenersBoundRef.current = false
  }, [onRouteDragEnd, onRouteDragMove])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Use CORS-enabled tiles. umnaapp.in lacks CORS headers and returns 404 for tiles.
    const env = import.meta.env.VITE_TILESERVER_URL
    const tileUrl = env?.includes('{z}')
      ? env
      : env
        ? `${String(env).replace(/\/+$/, '')}/tiles/{z}/{x}/{y}.png`
        : 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
    const attribution = tileUrl.includes('cartocdn') ? '© CARTO © OpenStreetMap' : '© UMNAAPP'
    const indiaBounds = [
      [68.0, 6.0],
      [97.0, 37.0],
    ]

    let map
    try {
      map = new maplibregl.Map({
      container: mapContainerRef.current,
      preserveDrawingBuffer: true,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19,
            attribution,
          },
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            // Keep in sync with source maxzoom to avoid odd tile requests at high zoom
            maxzoom: 19,
          },
        ],
        // demotiles.maplibre.org often 404s for Open Sans; OpenMapTiles CDN is stable for glyphs
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
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
      if (typeof onMapReady === 'function') {
        onMapReady(map)
      }
      console.log('✅ Map loaded')
    })

    // Only update zoom state when zooming ends — avoids per-frame React re-renders
    map.on('zoomend', () => setMapZoom(map.getZoom()))

    map.on('error', (e) => {
      const err = e.error
      const msg = err?.message || (typeof err === 'string' ? err : '') || 'Unknown map error'

      // Raster tile fetch failures (404, CORS, timeout) fire once per tile — not fatal; map still works.
      if (e.tile != null) {
        if (import.meta.env.DEV) {
          console.warn('[map] Tile failed:', msg)
        }
        return
      }

      // Missing glyph ranges should not replace the whole map with an error screen
      if (/glyph|font|\.pbf/i.test(msg)) {
        if (import.meta.env.DEV) {
          console.warn('[map] Glyph load issue:', msg)
        }
        return
      }

      console.error('Map error:', e)
      setMapInitError(msg || 'Map failed to load')
    })

    mapRef.current = map

    return () => {
      unbindRouteEditListeners()
      if (routeDragRafRef.current) {
        window.cancelAnimationFrame(routeDragRafRef.current)
        routeDragRafRef.current = null
      }
      if (routeEditEmitRafRef.current) {
        window.cancelAnimationFrame(routeEditEmitRafRef.current)
        routeEditEmitRafRef.current = null
      }
      if (searchedMarkerRef.current) {
        searchedMarkerRef.current.remove()
        searchedMarkerRef.current = null
      }
      Object.values(searchResultMarkersRef.current).forEach((m) => m?.remove())
      searchResultMarkersRef.current = {}
      Object.values(routeEndpointMarkersRef.current).forEach((m) => m?.remove())
      routeEndpointMarkersRef.current = {}
      if (placePopupRef.current) {
        placePopupRef.current.remove()
        placePopupRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    } catch (err) {
      console.error('Map init error:', err)
      setMapInitError(err?.message || 'Map failed to initialize')
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
  // Setup clustered place layers once (Google Maps-like smooth performance for large datasets).
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    if (!map.getSource(PLACE_SOURCE_ID)) {
      map.addSource(PLACE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      })
    }

    if (!map.getLayer(PLACE_CLUSTER_LAYER_ID)) {
      map.addLayer({
        id: PLACE_CLUSTER_LAYER_ID,
        type: 'circle',
        source: PLACE_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0284C7',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            16,
            20,
            20,
            60,
            24,
            150,
            28,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.85,
        },
      })
    }

    if (!map.getLayer(PLACE_CLUSTER_COUNT_LAYER_ID)) {
      map.addLayer({
        id: PLACE_CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: PLACE_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })
    }

    if (!map.getLayer(PLACE_POINT_LAYER_ID)) {
      map.addLayer({
        id: PLACE_POINT_LAYER_ID,
        type: 'circle',
        source: PLACE_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            ...Object.entries(CATEGORY_COLORS).flatMap(([category, color]) => [category, color]),
            CATEGORY_COLORS.Other,
          ],
          'circle-radius': 7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      })
    }

    if (!map.getLayer(PLACE_LABEL_LAYER_ID)) {
      map.addLayer({
        id: PLACE_LABEL_LAYER_ID,
        type: 'symbol',
        source: PLACE_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-offset': [0, 1.35],
          'text-anchor': 'top',
          'text-max-width': 12,
        },
        paint: {
          'text-color': '#1e293b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.2,
        },
      })
    }

    const handleClusterClick = (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const clusterId = feature.properties?.cluster_id
      const source = map.getSource(PLACE_SOURCE_ID)
      if (!source || clusterId == null || typeof source.getClusterExpansionZoom !== 'function') return
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return
        map.easeTo({
          center: feature.geometry.coordinates,
          zoom,
          duration: 350,
        })
      })
    }

    const handlePointClick = (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const [lng, lat] = feature.geometry.coordinates
      const name = feature.properties?.name || 'Place'
      const category = feature.properties?.category || 'Other'
      const sourceType = feature.properties?.source || 'contribution'
      const popupHtml = `<div class="p-2 min-w-[150px]"><strong class="text-slate-800">${escapeHtml(name)}</strong><div class="text-xs text-slate-600 mt-1">${escapeHtml(category)}</div><div class="text-[11px] text-slate-500 mt-1">${escapeHtml(sourceType)}</div></div>`

      if (placePopupRef.current) {
        placePopupRef.current.remove()
      }
      placePopupRef.current = new maplibregl.Popup({ offset: 14 })
        .setLngLat([lng, lat])
        .setHTML(popupHtml)
        .addTo(map)
    }

    const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
    const resetPointer = () => { map.getCanvas().style.cursor = '' }

    map.on('click', PLACE_CLUSTER_LAYER_ID, handleClusterClick)
    map.on('click', PLACE_POINT_LAYER_ID, handlePointClick)
    map.on('mouseenter', PLACE_CLUSTER_LAYER_ID, setPointer)
    map.on('mouseleave', PLACE_CLUSTER_LAYER_ID, resetPointer)
    map.on('mouseenter', PLACE_POINT_LAYER_ID, setPointer)
    map.on('mouseleave', PLACE_POINT_LAYER_ID, resetPointer)

    return () => {
      map.off('click', PLACE_CLUSTER_LAYER_ID, handleClusterClick)
      map.off('click', PLACE_POINT_LAYER_ID, handlePointClick)
      map.off('mouseenter', PLACE_CLUSTER_LAYER_ID, setPointer)
      map.off('mouseleave', PLACE_CLUSTER_LAYER_ID, resetPointer)
      map.off('mouseenter', PLACE_POINT_LAYER_ID, setPointer)
      map.off('mouseleave', PLACE_POINT_LAYER_ID, resetPointer)
    }
  }, [mapLoaded])

  // Update clustered place source data when category-filtered places change.
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const source = mapRef.current.getSource(PLACE_SOURCE_ID)
    if (!source || typeof source.setData !== 'function') return

    const features = places
      .filter((place) => Number.isFinite(place.longitude) && Number.isFinite(place.latitude))
      .map((place) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [place.longitude, place.latitude],
        },
        properties: {
          id: place.id,
          name: place.name || place.place_name_en || 'Place',
          category: place.category || 'Other',
          source: place.source || 'contribution',
        },
      }))

    source.setData({
      type: 'FeatureCollection',
      features,
    })
  }, [mapLoaded, places])

  // Search result markers (from umnaapp.in/search)'
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

    if (autoFitSearchResults && searchResultPlaces.length > 1) {
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
  }, [mapLoaded, searchResultPlaces, autoFitSearchResults])

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

  // GPS: bootstrap with a fast coarse fix, then high-accuracy watch. Code 3 = TIMEOUT is common
  // on Wi‑Fi/desktop — we avoid treating it as fatal if we already have a position.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    const relaxedRead = {
      enableHighAccuracy: false,
      maximumAge: 60000,
      timeout: 45000,
    }
    const strictWatch = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 60000,
    }

    const AUTO_FLY_MAX_ACCURACY_M = 100
    const REFINE_FLY_PREV_MIN_M = 70
    const REFINE_FLY_NEW_MAX_M = 35

    const applyPosition = (position) => {
      const { latitude, longitude, accuracy, speed, heading } = position.coords

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return
      }

      const acc = Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 150
      const location = { lat: latitude, lng: longitude, accuracy: acc, speed, heading }
      lastValidLocationRef.current = location
      setLocationError(null)

      if (acc <= 15) {
        setGpsStatus('high')
      } else if (acc <= 80) {
        setGpsStatus('acquiring')
      } else {
        setGpsStatus('weak')
      }

      updateUserLocation(location, acc <= 30)

      if (onLocationUpdate) {
        onLocationUpdate(location)
      }

      const map = mapRef.current
      const prevAcc = lastAppliedAccuracyRef.current
      lastAppliedAccuracyRef.current = acc

      // Do not auto-fly on coarse network/IP fixes (often 1km+ off): wait for GPS-level accuracy,
      // then fly; if nothing good arrives, fallback timer still centers on best available fix.
      if (map && !hasFlownToUserRef.current && acc <= AUTO_FLY_MAX_ACCURACY_M) {
        hasFlownToUserRef.current = true
        if (initialFlyFallbackTimerRef.current != null) {
          clearTimeout(initialFlyFallbackTimerRef.current)
          initialFlyFallbackTimerRef.current = null
        }
        map.flyTo({
          center: [longitude, latitude],
          zoom: acc <= 25 ? 16 : 15,
          duration: 1200,
        })
      } else if (
        map
        && hasFlownToUserRef.current
        && !hasRefinedFlyToGpsRef.current
        && prevAcc != null
        && prevAcc > REFINE_FLY_PREV_MIN_M
        && acc <= REFINE_FLY_NEW_MAX_M
      ) {
        hasRefinedFlyToGpsRef.current = true
        map.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          duration: 700,
        })
      }
    }

    const handleWatchError = (error) => {
      if (error.code === error.TIMEOUT) {
        if (lastValidLocationRef.current) {
          setLocationError(null)
          setGpsStatus('weak')
          return
        }
        setGpsStatus('weak')
        setLocationError(
          'Precise location is slow. Showing approximate position if available — tap the target button to retry.'
        )
        return
      }

      if (import.meta.env.DEV) {
        console.warn('Geolocation:', error.message || error.code)
      }
      let message = 'Location access denied. Please enable location services.'
      if (error.code === error.POSITION_UNAVAILABLE) {
        message = 'Location unavailable. Check GPS or try the target button to retry.'
      }
      setLocationError(message)
      setGpsStatus('weak')
    }

    // Fast approximate marker only — do not treat this as the “true” position for auto-fly
    navigator.geolocation.getCurrentPosition(applyPosition, () => {}, relaxedRead)

    watchIdRef.current = navigator.geolocation.watchPosition(
      applyPosition,
      handleWatchError,
      strictWatch
    )

    initialFlyFallbackTimerRef.current = setTimeout(() => {
      initialFlyFallbackTimerRef.current = null
      const map = mapRef.current
      const loc = lastValidLocationRef.current
      if (!map || !loc || hasFlownToUserRef.current) return
      hasFlownToUserRef.current = true
      map.flyTo({
        center: [loc.lng, loc.lat],
        zoom: 14,
        duration: 1000,
      })
    }, 14000)

    return () => {
      if (initialFlyFallbackTimerRef.current != null) {
        clearTimeout(initialFlyFallbackTimerRef.current)
        initialFlyFallbackTimerRef.current = null
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      hasRefinedFlyToGpsRef.current = false
      lastAppliedAccuracyRef.current = null
    }
    // updateUserLocation: stable useCallback below; omit from deps (declared after this hook)
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

  // Fly to user's current location (always prefer a fresh high-accuracy read on tap)
  const locateMe = useCallback(() => {
    if (!mapRef.current) return
    if (!navigator.geolocation) return

    const flyAndMark = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const acc = Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 150
        updateUserLocation({ lat: latitude, lng: longitude, accuracy: acc }, acc <= 30)
      }
      mapRef.current.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 16,
        duration: 800,
      })
      setLocationError(null)
    }

    navigator.geolocation.getCurrentPosition(flyAndMark, () => {
      navigator.geolocation.getCurrentPosition(flyAndMark, () => {
        if (currentLocation?.lng != null && currentLocation?.lat != null) {
          mapRef.current.flyTo({
            center: [currentLocation.lng, currentLocation.lat],
            zoom: 16,
            duration: 800,
          })
        }
      }, {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 60000,
      })
    }, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 25000,
    })
  }, [currentLocation, updateUserLocation])

  // Draw route on map
  const drawRoute = useCallback((routeData, options = {}) => {
    if (!mapRef.current) return
    const feature = toFeatureGeometry(routeData)
    if (!feature) return

    const shouldFitBounds = options.fitBounds !== false
    const lineColor = options.color || '#136AEC'
    const lineDash = options.dashArray || null

    // Remove existing route
    if (mapRef.current.getLayer('route')) {
      mapRef.current.removeLayer('route')
    }
    if (mapRef.current.getLayer('route-hit')) {
      mapRef.current.removeLayer('route-hit')
    }
    if (mapRef.current.getSource('route')) {
      mapRef.current.removeSource('route')
    }

    // Add route source
    mapRef.current.addSource('route', {
      type: 'geojson',
      data: feature,
    })

    // Invisible but wider hit target for drag interactions.
    mapRef.current.addLayer({
      id: 'route-hit',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#000000',
        'line-width': 20,
        'line-opacity': 0,
      },
    })

    // Add route layer
    const routePaint = {
      'line-color': lineColor,
      'line-width': 4,
      'line-opacity': 0.8,
    }
    if (lineDash) {
      routePaint['line-dasharray'] = lineDash
    }

    mapRef.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: routePaint,
    })

    routeLayerRef.current = true
    routeGeoJsonRef.current = feature
    bindRouteEditListeners()

    // Fit map to route bounds
    const coordinates = feature.geometry.coordinates
    if (shouldFitBounds && coordinates.length > 0) {
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      )
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      })
    }
  }, [bindRouteEditListeners, toFeatureGeometry])

  // Expose methods via ref (for parent component)
  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    calculateRoute: async (start, end, waypoints = [], profile = 'driving', routeOptions = {}) => {
      const backendProfile = profile === 'two_wheeler' ? 'driving' : profile
      const params = {
        start: `${start.lat},${start.lng}`,
        end: `${end.lat},${end.lng}`,
        profile: backendProfile,
      }
      if (waypoints.length > 0) {
        params.waypoints = waypoints.map((wp) => `${wp.lat},${wp.lng}`).join(';')
      }

      const response = await api.get('/map/route', { params })
      const routeData = response.data

      if (!routeData?.geometry) {
        throw new Error('No route geometry returned from route service')
      }

      // For two-wheeler, adjust duration (faster than car in traffic)
      if (profile === 'two_wheeler' && routeData.duration) {
        routeData.duration = Math.round(routeData.duration * 0.75)
      }

      drawRoute({ geometry: routeData.geometry }, routeOptions)
      setRoute(routeData)

      return routeData
    },
    clearRoute: () => {
      if (mapRef.current?.getLayer('route')) {
        mapRef.current.removeLayer('route')
      }
      if (mapRef.current?.getLayer('route-hit')) {
        mapRef.current.removeLayer('route-hit')
      }
      if (mapRef.current?.getSource('route')) {
        mapRef.current.removeSource('route')
      }
      if (routeLayerRef.current) {
        routeLayerRef.current = null
      }
      routeGeoJsonRef.current = null
      routeEditStateRef.current = null
      setRoute(null)
    },
    setRouteGeometry: (geometry, options = {}) => {
      drawRoute(geometry, options)
    },
    setRouteEditHandler: (handler) => {
      routeEditHandlerRef.current = typeof handler === 'function' ? handler : null
    },
    flyTo: (options) => {
      if (mapRef.current) {
        mapRef.current.flyTo(options)
      }
    },
    showSearchedLocation: (location, options = {}) => {
      if (!mapRef.current || !location) return

      const name = location.name || 'Searched Location'

      // Build a rich marker with pin + label (like Google Maps search result)
      const wrapper = document.createElement('div')
      wrapper.style.display = 'flex'
      wrapper.style.flexDirection = 'column'
      wrapper.style.alignItems = 'center'
      wrapper.style.cursor = 'pointer'

      const pin = document.createElement('div')
      pin.style.width = '24px'
      pin.style.height = '24px'
      pin.style.borderRadius = '50%'
      pin.style.backgroundColor = '#EF4444'
      pin.style.border = '3px solid white'
      pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'

      const label = document.createElement('div')
      label.textContent = name
      label.style.maxWidth = '160px'
      label.style.fontSize = '11px'
      label.style.fontWeight = '600'
      label.style.color = '#1e293b'
      label.style.background = 'rgba(255,255,255,0.95)'
      label.style.padding = '3px 8px'
      label.style.borderRadius = '6px'
      label.style.marginTop = '4px'
      label.style.textAlign = 'center'
      label.style.whiteSpace = 'nowrap'
      label.style.overflow = 'hidden'
      label.style.textOverflow = 'ellipsis'
      label.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)'

      wrapper.appendChild(pin)
      wrapper.appendChild(label)
      wrapper.title = name

      if (searchedMarkerRef.current) {
        searchedMarkerRef.current.remove()
      }

      const popup = new maplibregl.Popup({ offset: 25, closeButton: true, closeOnClick: false })
        .setHTML(
          `<div style="padding:6px 4px;min-width:120px"><strong style="font-size:13px;color:#1e293b">${name.replace(/</g, '&lt;')}</strong></div>`
        )

      searchedMarkerRef.current = new maplibregl.Marker({ element: wrapper, anchor: 'bottom' })
        .setLngLat([location.lng, location.lat])
        .setPopup(popup)
        .addTo(mapRef.current)

      // Auto-open the popup after flying to the location
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: options.zoom || 15,
        duration: options.duration || 1000,
      })

      // Open popup once fly animation finishes
      mapRef.current.once('moveend', () => {
        if (searchedMarkerRef.current) {
          searchedMarkerRef.current.togglePopup()
        }
      })
    },
  }), [drawRoute])

  return (
    <div className={`relative w-full h-full ${addPlaceMode ? 'cursor-crosshair' : ''}`}>
      {mapInitError ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 bg-slate-100">
          <p className="text-slate-700 font-medium">Map could not load</p>
          <p className="text-sm text-slate-600 text-center max-w-md">{mapInitError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Reload
          </button>
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Loading overlay - visible until map loads (avoids blank white screen) */}
          {!mapLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100/90 z-[5]">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
              <p className="text-slate-700 font-medium text-sm">Loading map...</p>
            </div>
          )}

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

      {/* My Location Button */}
      {mapLoaded && (
        <button
          onClick={locateMe}
          title="Go to my location"
          className="absolute right-2 sm:right-4 glass rounded-lg shadow-lg z-10 p-2.5 hover:bg-white/80 active:scale-95 transition-all"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={currentLocation ? '#136AEC' : '#64748b'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" strokeOpacity="0.4" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      )}

      {/* Vehicle Count */}
      {vehicles.length > 0 && (
        <div className="absolute top-4 right-4 glass rounded-lg p-3 shadow-lg z-10">
          <div className="text-sm font-medium text-slate-700">
            Vehicles: {vehicles.length}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
})

MapComponent.displayName = 'MapComponent'

export default MapComponent

