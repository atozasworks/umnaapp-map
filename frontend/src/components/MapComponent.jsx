import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSocket } from '../contexts/SocketContext'
import api from '../services/api'
import { formatAddressSubtitle } from '../utils/formatAddress'
import { whenStyleReady } from '../utils/mapWhenStyleReady'
import { formatMeasureLabel } from '../utils/measureDistance'
import { resolvePlaceRendering } from '../utils/mapRenderingConfig'
import {
  applyMarkerLabelState,
  collectMapLabelReservedRects,
  computeLabelSafeBounds,
  layoutUserPlaceLabels,
  resolveUserPlaceLabelCap,
  setMarkerLabelMeasureMode,
  throttle,
} from '../utils/userPlaceLabelLayout'

/** Below search/nav overlays (z-20 / z-30) — place names stay on the map layer only. */
const USER_PLACE_MARKER_Z_INDEX = 8

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
/** Google Maps–style basemap overlays (raster); labels on satellite like Hybrid */
const BASEMAP_LABEL_SOURCE_ID = 'basemap-label-overlay-source'
const BASEMAP_LABEL_LAYER_ID = 'basemap-label-overlay-layer'
const SATELLITE_TILES = ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']
const TERRAIN_TILES = ['https://tile.opentopomap.org/{z}/{x}/{y}.png']
const LABEL_OVERLAY_TILES = ['https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png']
const BASEMAP_STORAGE_KEY = 'umnaapp_basemap'
const MEASURE_SOURCE_ID = 'measure-distance-source'
const MEASURE_LINE_OUTLINE_LAYER_ID = 'measure-distance-line-outline'
const MEASURE_LINE_LAYER_ID = 'measure-distance-line'

/** Saved-place labels: fade in by zoom; full names from z12.5; all in-view names from z14+. */
const USER_PLACE_LABEL_ZOOM_START = 10
const USER_PLACE_LABEL_ZOOM_FULL = 12.5
const USER_PLACE_LABEL_MIN_ZOOM = 11
const USER_PLACE_SHOW_ALL_NAMES_ZOOM = 14

const userPlaceLabelOpacity = (zoom, place = null) => {
  const z = Number(zoom)
  if (!Number.isFinite(z)) return 0
  const start = USER_PLACE_LABEL_ZOOM_START
  const full = USER_PLACE_LABEL_ZOOM_FULL
  const placeOpacity = place ? (resolvePlaceRendering(place, z).opacity ?? 1) : 1
  if (z <= start) return 0
  if (z >= full) return placeOpacity
  return ((z - start) / (full - start)) * placeOpacity
}

/** Minimum zoom before a place name is eligible (map-wide, not per stored extract config). */
const userPlaceTextLabelMinZoom = (_place, mapZoom) => {
  const z = Number(mapZoom)
  if (!Number.isFinite(z) || z < USER_PLACE_LABEL_ZOOM_START) return 99
  return USER_PLACE_LABEL_MIN_ZOOM
}

const LABEL_PRIORITY_CATEGORY_BOOST = {
  Hospital: 18,
  'Police Station': 16,
  'Tourist Place': 14,
  Temple: 12,
  Museum: 12,
  School: 10,
  Bank: 8,
  Transit: 8,
  'Bus Stop': 8,
}

const userPlaceLabelPriority = (place, mapZoom) => {
  const render = resolvePlaceRendering(place, mapZoom)
  let p = render.priority
  const cat = place?.category
  if (cat && LABEL_PRIORITY_CATEGORY_BOOST[cat]) {
    p += LABEL_PRIORITY_CATEGORY_BOOST[cat]
  }
  const zl = Number(place?.zoomLevel)
  if (Number.isFinite(zl) && mapZoom + 0.5 >= zl) p += 8
  return p
}

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

/** DB / API may use latitude/longitude or lat/lng */
const getPlaceLngLat = (place) => {
  const lng = Number(place?.longitude ?? place?.lng)
  const lat = Number(place?.latitude ?? place?.lat)
  if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat }
  return null
}

const PLACE_LABEL_TEXT_SHADOW =
  '0 0 1px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.9), '
  + '1px 0 1px rgba(255,255,255,0.85), -1px 0 1px rgba(255,255,255,0.85), '
  + '0 1px 1px rgba(255,255,255,0.85), 0 -1px 1px rgba(255,255,255,0.85)'

/** DOM marker: place name label only (no pin dots), Google Maps–style. */
const createUserPlaceMarkerElement = (place, rendering = null) => {
  const render = rendering || resolvePlaceRendering(place, 15)
  const displayName = String(
    (place.place_name_local && String(place.place_name_local).trim())
    || (place.name && String(place.name).trim())
    || (place.place_name_en && String(place.place_name_en).trim())
    || 'Place'
  )

  const isPending = place?.approvalStatus === 'pending'

  const wrapper = document.createElement('div')
  wrapper.className = isPending ? 'user-place-marker user-place-marker--pending' : 'user-place-marker'
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'flex-end'
  wrapper.style.cursor = 'pointer'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.textAlign = 'center'
  wrapper.style.background = 'transparent'
  wrapper.style.transition = 'opacity 0.2s ease-out'
  wrapper.style.opacity = '0'
  wrapper.dataset.labelPlacement = 'top'

  const label = document.createElement('div')
  label.className = 'user-place-marker-label'
  label.textContent = displayName
  label.style.display = 'none'
  label.style.pointerEvents = 'none'

  const anchor = document.createElement('div')
  anchor.className = 'user-place-marker-anchor'
  anchor.setAttribute('aria-hidden', 'true')
  anchor.style.display = 'none'

  wrapper.style.zIndex = String(USER_PLACE_MARKER_Z_INDEX)
  wrapper.dataset.renderPriority = String(render.priority ?? 50)

  wrapper.appendChild(label)
  wrapper.appendChild(anchor)
  wrapper.title = displayName
  return wrapper
}

const createSearchResultMarkerElement = (place) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'search-result-marker-wrapper user-place-marker'
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'flex-end'
  wrapper.style.cursor = 'pointer'
  wrapper.style.pointerEvents = 'auto'
  wrapper.style.textAlign = 'center'
  wrapper.style.background = 'transparent'

  const label = document.createElement('div')
  label.className = 'user-place-marker-label'
  label.textContent = place.displayName || place.name || 'Place'
  label.style.maxWidth = '180px'
  label.style.fontSize = '12px'
  label.style.fontWeight = '500'
  label.style.lineHeight = '1.25'
  label.style.color = '#1a1a1a'
  label.style.background = 'transparent'
  label.style.padding = '0'
  label.style.margin = '0 0 2px 0'
  label.style.textAlign = 'center'
  label.style.whiteSpace = 'normal'
  label.style.wordBreak = 'break-word'
  label.style.textShadow = PLACE_LABEL_TEXT_SHADOW

  const anchor = document.createElement('div')
  anchor.className = 'user-place-marker-anchor'
  anchor.setAttribute('aria-hidden', 'true')
  anchor.style.width = '1px'
  anchor.style.height = '1px'
  anchor.style.flexShrink = '0'
  anchor.style.opacity = '0'

  wrapper.appendChild(label)
  wrapper.appendChild(anchor)
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

const applyPlaceMarkerSelected = (el, placeId, selectedPlaceId) => {
  if (!el) return
  const id = placeId != null ? String(placeId) : ''
  const isSelected = Boolean(selectedPlaceId && id && String(selectedPlaceId) === id)
  el.classList.toggle('user-place-marker--selected', isSelected)
}

const placeFromSearchMarker = (place) => ({
  id: place.placeId,
  place_name_en: place.displayName || place.name,
  name: place.displayName || place.name,
  latitude: place.lat,
  longitude: place.lng,
  category: place.category || 'Other',
  _isDbPlace: Boolean(place.placeId && /^[0-9a-f-]{36}$/.test(String(place.placeId))),
})

const MapComponent = forwardRef(({
  onLocationUpdate,
  onMapClick,
  onMapContextMenu,
  onMapReady,
  onPlaceClick,
  selectedPlaceId = null,
  addPlaceMode,
  blockAddPlaceMapClick = false,
  blockContextMenu = false,
  measureDistanceActive = false,
  onMeasureDistanceChange,
  places = [],
  searchResultPlaces = [],
  polygonOverlayPlaces = [],
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
  const polygonOverlayMarkersRef = useRef({})
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
  const initialFlyFallbackTimerRef = useRef(null)
  const placePopupRef = useRef(null)
  const hasFittedUserPlacesRef = useRef(false)
  const userPlaceMarkersRef = useRef({})
  const userPlaceCollisionRafRef = useRef(null)
  const streetTilesUrlRef = useRef(null)
  const measurePointsRef = useRef([])
  const measureLabelMarkersRef = useRef([])
  const measureVertexMarkersRef = useRef([])
  const measureDraggingRef = useRef(false)
  const longPressTimerRef = useRef(null)
  const longPressStartRef = useRef(null)
  const addPlaceModeRef = useRef(addPlaceMode)
  const onMapClickRef = useRef(onMapClick)
  addPlaceModeRef.current = addPlaceMode
  onMapClickRef.current = onMapClick
  const { socket } = useSocket()
  const [measureTotalMeters, setMeasureTotalMeters] = useState(0)
  const [measurePointCount, setMeasurePointCount] = useState(0)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapZoom, setMapZoom] = useState(null)
  const [mapInitError, setMapInitError] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('acquiring') // 'acquiring', 'high', 'weak'
  const [currentLocation, setCurrentLocation] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [route, setRoute] = useState(null)
  const [basemapMode, setBasemapMode] = useState(() => {
    try {
      const v = localStorage.getItem(BASEMAP_STORAGE_KEY)
      if (v === 'satellite' || v === 'terrain' || v === 'street') return v
    } catch {
      /* ignore */
    }
    return 'street'
  })
  const [layersMenuOpen, setLayersMenuOpen] = useState(false)

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

  const clearMeasureLabelMarkers = useCallback(() => {
    measureLabelMarkersRef.current.forEach((m) => m?.remove())
    measureLabelMarkersRef.current = []
  }, [])

  const clearMeasureVertexMarkers = useCallback(() => {
    measureVertexMarkersRef.current.forEach((m) => m?.remove())
    measureVertexMarkersRef.current = []
  }, [])

  const setMeasureLineData = useCallback((map, points) => {
    if (!map?.isStyleLoaded?.()) return
    const features =
      points.length >= 2
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: points },
            },
          ]
        : []
    const source = map.getSource(MEASURE_SOURCE_ID)
    if (source) {
      source.setData({ type: 'FeatureCollection', features })
    }
  }, [])

  const ensureMeasureLayers = useCallback((map) => {
    if (!map?.isStyleLoaded?.()) return
    if (!map.getSource(MEASURE_SOURCE_ID)) {
      map.addSource(MEASURE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
    }
    if (!map.getLayer(MEASURE_LINE_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: MEASURE_LINE_OUTLINE_LAYER_ID,
        type: 'line',
        source: MEASURE_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': '#ffffff',
          'line-width': 6,
          'line-opacity': 0.95,
        },
      })
    }
    if (!map.getLayer(MEASURE_LINE_LAYER_ID)) {
      map.addLayer({
        id: MEASURE_LINE_LAYER_ID,
        type: 'line',
        source: MEASURE_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': '#1a73e8',
          'line-width': 4,
        },
      })
    }
  }, [])

  const rebuildMeasureSegmentLabels = useCallback(
    (map, points) => {
      clearMeasureLabelMarkers()
      for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1]
        const b = points[i]
        const segM = haversineDistanceMeters(a, b)
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const el = document.createElement('div')
        el.className = 'measure-segment-label'
        el.textContent = formatMeasureLabel(segM)
        Object.assign(el.style, {
          background: '#fff',
          color: '#1a73e8',
          fontSize: '11px',
          fontWeight: '600',
          padding: '3px 8px',
          borderRadius: '12px',
          border: '1px solid rgba(26,115,232,0.25)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(mid)
          .addTo(map)
        measureLabelMarkersRef.current.push(marker)
      }
    },
    [clearMeasureLabelMarkers, haversineDistanceMeters]
  )

  const rebuildMeasureVertexMarkers = useCallback(
    (map, points) => {
      clearMeasureVertexMarkers()
      points.forEach((coord, idx) => {
        const el = document.createElement('div')
        el.style.width = '14px'
        el.style.height = '14px'
        el.style.borderRadius = '50%'
        el.style.background = '#ffffff'
        el.style.border = '2px solid #1a73e8'
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)'
        el.style.cursor = 'grab'
        el.style.touchAction = 'none'
        el.addEventListener('mousedown', () => {
          el.style.cursor = 'grabbing'
        })
        el.addEventListener('mouseup', () => {
          el.style.cursor = 'grab'
        })
        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(coord)
          .addTo(map)
        marker.on('dragstart', () => {
          measureDraggingRef.current = true
          if (map.dragPan) map.dragPan.disable()
        })
        marker.on('drag', () => {
          const ll = marker.getLngLat()
          const next = [...measurePointsRef.current]
          next[idx] = [ll.lng, ll.lat]
          measurePointsRef.current = next
          setMeasureLineData(map, next)
          const runningTotal = getLineDistanceMeters(next)
          setMeasureTotalMeters(runningTotal)
          setMeasurePointCount(next.length)
          if (onMeasureDistanceChange) {
            onMeasureDistanceChange({ totalMeters: runningTotal, pointCount: next.length })
          }
        })
        marker.on('dragend', () => {
          measureDraggingRef.current = false
          if (map.dragPan) map.dragPan.enable()
          const ll = marker.getLngLat()
          const next = [...measurePointsRef.current]
          next[idx] = [ll.lng, ll.lat]
          measurePointsRef.current = next
          const total = getLineDistanceMeters(next)
          setMeasureTotalMeters(total)
          setMeasurePointCount(next.length)
          setMeasureLineData(map, next)
          rebuildMeasureSegmentLabels(map, next)
          if (onMeasureDistanceChange) {
            onMeasureDistanceChange({ totalMeters: total, pointCount: next.length })
          }
        })
        measureVertexMarkersRef.current.push(marker)
      })
    },
    [
      clearMeasureVertexMarkers,
      getLineDistanceMeters,
      onMeasureDistanceChange,
      rebuildMeasureSegmentLabels,
      setMeasureLineData,
    ]
  )

  const syncMeasurePath = useCallback(
    (points) => {
      const map = mapRef.current
      measurePointsRef.current = points
      const total = getLineDistanceMeters(points)
      setMeasureTotalMeters(total)
      setMeasurePointCount(points.length)
      if (map?.isStyleLoaded?.()) {
        ensureMeasureLayers(map)
        setMeasureLineData(map, points)
        rebuildMeasureSegmentLabels(map, points)
        rebuildMeasureVertexMarkers(map, points)
      }
      if (onMeasureDistanceChange) {
        onMeasureDistanceChange({ totalMeters: total, pointCount: points.length })
      }
    },
    [
      ensureMeasureLayers,
      getLineDistanceMeters,
      onMeasureDistanceChange,
      rebuildMeasureSegmentLabels,
      rebuildMeasureVertexMarkers,
      setMeasureLineData,
    ]
  )

  const clearMeasureDistance = useCallback(() => {
    const map = mapRef.current
    measurePointsRef.current = []
    setMeasureTotalMeters(0)
    setMeasurePointCount(0)
    clearMeasureLabelMarkers()
    clearMeasureVertexMarkers()
    if (map?.isStyleLoaded?.()) {
      const source = map.getSource(MEASURE_SOURCE_ID)
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] })
      }
    }
    if (onMeasureDistanceChange) {
      onMeasureDistanceChange({ totalMeters: 0, pointCount: 0 })
    }
  }, [clearMeasureLabelMarkers, clearMeasureVertexMarkers, onMeasureDistanceChange])

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
      const map = mapRef.current
      const source = map?.getSource('route')
      if (source && map?.isStyleLoaded?.()) {
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
    streetTilesUrlRef.current = tileUrl
    const attribution =
      '© OpenStreetMap © CARTO © Esri © OpenTopoMap' +
      (tileUrl.includes('cartocdn') ? '' : ' © UMNAAPP')
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
      Object.values(polygonOverlayMarkersRef.current).forEach((m) => m?.remove())
      polygonOverlayMarkersRef.current = {}
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

  const emitAddPlaceMapPick = useCallback((lat, lng) => {
    const map = mapRef.current
    const pick = onMapClickRef.current
    if (!map || !pick) return
    pick({ latitude: lat, longitude: lng, zoomLevel: map.getZoom() })
  }, [])

  // Map click for Add Place location selection
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !onMapClick) return

    const handleMapClick = (e) => {
      if (blockAddPlaceMapClick) return
      if (!addPlaceMode) return
      if (e.originalEvent?.target?.closest?.('.maplibregl-marker')) return
      const { lng, lat } = e.lngLat
      emitAddPlaceMapPick(lat, lng)
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [addPlaceMode, blockAddPlaceMapClick, mapLoaded, onMapClick, emitAddPlaceMapPick])

  // Right-click / long-press context menu
  useEffect(() => {
    const map = mapRef.current
    if (!map || !onMapContextMenu) return undefined

    const openMenuAt = (lngLat, point) => {
      if (blockContextMenu || addPlaceMode || blockAddPlaceMapClick || measureDistanceActive) return
      const rect = map.getContainer().getBoundingClientRect()
      onMapContextMenu({
        lat: lngLat.lat,
        lng: lngLat.lng,
        x: rect.left + point.x,
        y: rect.top + point.y,
      })
    }

    const onContextMenu = (e) => {
      e.preventDefault()
      openMenuAt(e.lngLat, e.point)
    }

    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      longPressStartRef.current = null
    }

    const onTouchStart = (e) => {
      if (blockContextMenu || addPlaceMode || blockAddPlaceMapClick || measureDistanceActive) return
      if (e.originalEvent?.touches?.length !== 1) return
      const touch = e.originalEvent.touches[0]
      longPressStartRef.current = { x: touch.clientX, y: touch.clientY, point: e.point }
      clearLongPress()
      longPressTimerRef.current = window.setTimeout(() => {
        const start = longPressStartRef.current
        if (!start) return
        const rect = map.getContainer().getBoundingClientRect()
        const x = start.point?.x ?? touch.clientX - rect.left
        const y = start.point?.y ?? touch.clientY - rect.top
        const lngLat = map.unproject([x, y])
        openMenuAt(lngLat, { x, y })
        if (navigator.vibrate) navigator.vibrate(30)
      }, 520)
    }

    const onTouchMove = (e) => {
      const start = longPressStartRef.current
      if (!start || !e.originalEvent?.touches?.[0]) return
      const touch = e.originalEvent.touches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (Math.hypot(dx, dy) > 12) clearLongPress()
    }

    const onTouchEnd = () => clearLongPress()

    map.on('contextmenu', onContextMenu)
    map.on('touchstart', onTouchStart)
    map.on('touchmove', onTouchMove)
    map.on('touchend', onTouchEnd)
    map.on('touchcancel', onTouchEnd)

    return () => {
      clearLongPress()
      map.off('contextmenu', onContextMenu)
      map.off('touchstart', onTouchStart)
      map.off('touchmove', onTouchMove)
      map.off('touchend', onTouchEnd)
      map.off('touchcancel', onTouchEnd)
    }
  }, [
    addPlaceMode,
    blockAddPlaceMapClick,
    blockContextMenu,
    measureDistanceActive,
    onMapContextMenu,
  ])

  // Measure distance mode
  useEffect(() => {
    const map = mapRef.current
    if (!map || !measureDistanceActive) return undefined

    const onMeasureClick = (e) => {
      if (measureDraggingRef.current) return
      if (e.originalEvent?.button > 0) return
      if (e.originalEvent?.target?.closest?.('.maplibregl-marker')) return
      const coord = [e.lngLat.lng, e.lngLat.lat]
      const points = [...measurePointsRef.current, coord]
      syncMeasurePath(points)
    }

    const onMeasureDblClick = (e) => {
      e.preventDefault()
    }

    whenStyleReady(map, () => ensureMeasureLayers(map))
    map.getCanvas().style.cursor = 'crosshair'
    map.doubleClickZoom.disable()
    map.on('click', onMeasureClick)
    map.on('dblclick', onMeasureDblClick)

    return () => {
      map.getCanvas().style.cursor = ''
      map.doubleClickZoom.enable()
      map.off('click', onMeasureClick)
      map.off('dblclick', onMeasureDblClick)
    }
  }, [measureDistanceActive, ensureMeasureLayers, syncMeasurePath])

  useEffect(() => {
    if (!measureDistanceActive) {
      clearMeasureDistance()
    }
  }, [measureDistanceActive, clearMeasureDistance])

  // Google Maps–style basemap: Street (default / env tiles), Satellite + labels, Terrain
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    let cancelled = false
    const mode = basemapMode

    const applyLabelOverlay = () => {
      if (cancelled || !mapRef.current) return
      const m = mapRef.current
      whenStyleReady(m, () => {
        if (cancelled) return
        const needsLabelOverlay = mode === 'satellite'
        if (needsLabelOverlay) {
          if (!m.getSource(BASEMAP_LABEL_SOURCE_ID)) {
            m.addSource(BASEMAP_LABEL_SOURCE_ID, {
              type: 'raster',
              tiles: LABEL_OVERLAY_TILES,
              tileSize: 256,
              minzoom: 0,
              maxzoom: 19,
              attribution: '© CARTO © OpenStreetMap',
            })
            m.addLayer({
              id: BASEMAP_LABEL_LAYER_ID,
              type: 'raster',
              source: BASEMAP_LABEL_SOURCE_ID,
              minzoom: 0,
              maxzoom: 19,
              paint: { 'raster-opacity': 1 },
            })
          } else {
            m.setLayoutProperty(BASEMAP_LABEL_LAYER_ID, 'visibility', 'visible')
          }
        } else if (m.getLayer(BASEMAP_LABEL_LAYER_ID)) {
          m.setLayoutProperty(BASEMAP_LABEL_LAYER_ID, 'visibility', 'none')
        }
      })
    }

    const onIdleAfterTiles = () => {
      if (cancelled) return
      applyLabelOverlay()
    }

    const disposeStyleWait = whenStyleReady(map, () => {
      if (cancelled) return
      const raster = map.getSource('raster-tiles')
      if (!raster || typeof raster.setTiles !== 'function') return

      const streetUrl =
        streetTilesUrlRef.current || 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'

      if (mode === 'street') {
        raster.setTiles([streetUrl])
      } else if (mode === 'satellite') {
        raster.setTiles(SATELLITE_TILES)
      } else {
        raster.setTiles(TERRAIN_TILES)
      }

      map.once('idle', onIdleAfterTiles)
    })

    return () => {
      cancelled = true
      map.off('idle', onIdleAfterTiles)
      disposeStyleWait()
    }
  }, [mapLoaded, basemapMode])

  useEffect(() => {
    try {
      localStorage.setItem(BASEMAP_STORAGE_KEY, basemapMode)
    } catch {
      /* ignore */
    }
  }, [basemapMode])

  // User places: HTML markers with screen-space collision (names stay readable; zoom + priority + caps).
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    Object.values(userPlaceMarkersRef.current).forEach((m) => m?.remove())
    userPlaceMarkersRef.current = {}

    const coordsList = []
    const markerEntries = []

    const initialZoom = map.getZoom()

    places.forEach((place, index) => {
      const ll = getPlaceLngLat(place)
      if (!ll) return
      const render = resolvePlaceRendering(place, initialZoom)
      if (!render.visible) return
      coordsList.push([ll.lng, ll.lat])

      const el = createUserPlaceMarkerElement(place, render)
      applyPlaceMarkerSelected(el, place.id, selectedPlaceId)
      const onMarkerClick = (e) => {
        e.stopPropagation()
        if (addPlaceModeRef.current && onMapClickRef.current) {
          emitAddPlaceMapPick(ll.lat, ll.lng)
          return
        }
        if (onPlaceClick) {
          if (placePopupRef.current) {
            placePopupRef.current.remove()
            placePopupRef.current = null
          }
          onPlaceClick(place)
        }
      }
      if (onPlaceClick || onMapClick) {
        el.addEventListener('click', onMarkerClick)
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([ll.lng, ll.lat])
        .addTo(map)

      const key = `p-${index}-${place.id ?? 'noid'}-${ll.lng}-${ll.lat}`
      userPlaceMarkersRef.current[key] = marker
      markerEntries.push({ key, marker, place, render })
    })

    const runUserPlaceLabelCollision = () => {
      const m = mapRef.current
      if (!m || markerEntries.length === 0) return
      const z = m.getZoom()

      const candidateKeys = new Set()
      const layoutCandidates = []

      const mapBounds = m.getBounds()
      const showAllNames = z >= USER_PLACE_SHOW_ALL_NAMES_ZOOM

      markerEntries.forEach(({ key, marker, place, render }) => {
        const liveRender = render || resolvePlaceRendering(place, z)
        if (!liveRender.visible) {
          applyMarkerLabelState(marker, { labelOn: false })
          return
        }
        const ll = getPlaceLngLat(place)
        const inViewport =
          ll && mapBounds && mapBounds.contains([ll.lng, ll.lat])
        if (!inViewport) {
          applyMarkerLabelState(marker, { labelOn: false })
          return
        }
        const op = userPlaceLabelOpacity(z, place)
        if (op < 0.02) {
          applyMarkerLabelState(marker, { labelOn: false })
          return
        }
        const textMin = userPlaceTextLabelMinZoom(place, z)
        if (z >= textMin) {
          candidateKeys.add(key)
          layoutCandidates.push({
            key,
            marker,
            place,
            priority: userPlaceLabelPriority(place, z),
          })
        } else {
          applyMarkerLabelState(marker, { labelOn: false })
        }
      })

      if (candidateKeys.size === 0) return

      layoutCandidates.forEach(({ marker }) => setMarkerLabelMeasureMode(marker, true))

      const maxLabels = showAllNames
        ? layoutCandidates.length
        : resolveUserPlaceLabelCap(z, layoutCandidates.length)

      const measureAndResolve = () => {
        const m2 = mapRef.current
        if (!m2) return

        const reservedRects = collectMapLabelReservedRects()
        const safeBounds = computeLabelSafeBounds(mapContainerRef.current, reservedRects)
        const winners = layoutUserPlaceLabels(layoutCandidates, {
          zoom: z,
          maxLabels,
          reservedRects,
          safeBounds,
        })

        markerEntries.forEach(({ key, marker }) => {
          if (!candidateKeys.has(key)) return
          const win = winners.get(key)
          if (win) {
            applyMarkerLabelState(marker, {
              labelOn: true,
              placement: win.placement,
            })
          } else {
            applyMarkerLabelState(marker, { labelOn: false })
          }
        })
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(measureAndResolve)
      })
    }

    const scheduleUserPlaceLabelCollision = () => {
      if (userPlaceCollisionRafRef.current != null) {
        cancelAnimationFrame(userPlaceCollisionRafRef.current)
      }
      userPlaceCollisionRafRef.current = requestAnimationFrame(() => {
        userPlaceCollisionRafRef.current = null
        runUserPlaceLabelCollision()
      })
    }

    const syncUserPlaceLabelsZoom = () => {
      const m = mapRef.current
      if (!m) return
      const z = m.getZoom()
      markerEntries.forEach(({ marker, place }) => {
        const el = marker.getElement?.()
        if (!el) return
        applyPlaceMarkerSelected(el, place.id, selectedPlaceId)
        const op = userPlaceLabelOpacity(z, place)
        el.style.opacity = String(op)
        const labelVisible = el.querySelector?.('.user-place-marker-label')?.style?.display === 'block'
        const interactive = Boolean(onPlaceClick) && labelVisible && op >= 0.05
        el.style.pointerEvents = interactive ? 'auto' : 'none'
        el.style.cursor = interactive ? 'pointer' : ''
      })
      scheduleUserPlaceLabelCollision()
    }

    const onMapMoveLabels = throttle(scheduleUserPlaceLabelCollision, 120)

    map.on('zoom', syncUserPlaceLabelsZoom)
    map.on('zoomend', syncUserPlaceLabelsZoom)
    map.on('move', onMapMoveLabels)
    map.on('moveend', scheduleUserPlaceLabelCollision)
    map.on('rotateend', scheduleUserPlaceLabelCollision)
    map.on('pitchend', scheduleUserPlaceLabelCollision)
    map.on('resize', scheduleUserPlaceLabelCollision)
    syncUserPlaceLabelsZoom()

    const fitToUserPlaces = () => {
      if (coordsList.length === 0) {
        hasFittedUserPlacesRef.current = false
        return
      }
      if (hasFittedUserPlacesRef.current) return
      hasFittedUserPlacesRef.current = true
      try {
        const bounds = coordsList.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coordsList[0], coordsList[0])
        )
        map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 800 })
      } catch {
        /* ignore invalid bounds */
      }
    }

    fitToUserPlaces()
    const onAfterInitialFit = () => scheduleUserPlaceLabelCollision()
    map.once('moveend', onAfterInitialFit)

    return () => {
      map.off('moveend', onAfterInitialFit)
      map.off('zoom', syncUserPlaceLabelsZoom)
      map.off('zoomend', syncUserPlaceLabelsZoom)
      map.off('move', onMapMoveLabels)
      map.off('moveend', scheduleUserPlaceLabelCollision)
      map.off('rotateend', scheduleUserPlaceLabelCollision)
      map.off('pitchend', scheduleUserPlaceLabelCollision)
      map.off('resize', scheduleUserPlaceLabelCollision)
      if (userPlaceCollisionRafRef.current != null) {
        cancelAnimationFrame(userPlaceCollisionRafRef.current)
        userPlaceCollisionRafRef.current = null
      }
      Object.values(userPlaceMarkersRef.current).forEach((marker) => marker.remove())
      userPlaceMarkersRef.current = {}
    }
  }, [mapLoaded, places, onPlaceClick, onMapClick, selectedPlaceId, emitAddPlaceMapPick])

  // Search result markers (from umnaapp.in/search)'
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    Object.values(searchResultMarkersRef.current).forEach((m) => m?.remove())
    searchResultMarkersRef.current = {}

    searchResultPlaces.forEach((place) => {
      const key = place.placeId || `${place.lat}-${place.lng}`
      const el = createSearchResultMarkerElement(place)
      applyPlaceMarkerSelected(el, place.placeId, selectedPlaceId)
      const markerOpts = { element: el, anchor: 'bottom' }
      const marker = new maplibregl.Marker(markerOpts)
        .setLngLat([place.lng, place.lat])
      if (onPlaceClick || onMapClick) {
        el.style.cursor = 'pointer'
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          if (addPlaceModeRef.current && onMapClickRef.current) {
            emitAddPlaceMapPick(place.lat, place.lng)
            return
          }
          if (onPlaceClick) onPlaceClick(placeFromSearchMarker(place))
        })
      } else {
        const addrSubtitle = place.address && typeof place.address === 'object'
          ? (formatAddressSubtitle(place.address) || [place.address.road, place.address.city, place.address.state].filter(Boolean).join(', '))
          : ''
        const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
          `<div class="p-2 min-w-[140px]"><strong class="text-slate-800">${escapeHtml(place.displayName || place.name || 'Place')}</strong>${addrSubtitle ? `<div class="text-xs text-slate-600 mt-1">${escapeHtml(addrSubtitle)}</div>` : ''}</div>`
        )
        marker.setPopup(popup)
      }
      marker.addTo(mapRef.current)
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
  }, [mapLoaded, searchResultPlaces, autoFitSearchResults, onPlaceClick, onMapClick, selectedPlaceId, emitAddPlaceMapPick])

  // Area-explore markers (polygon tool — same style as search chips)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    Object.values(polygonOverlayMarkersRef.current).forEach((m) => m?.remove())
    polygonOverlayMarkersRef.current = {}

    polygonOverlayPlaces.forEach((place) => {
      const key = place.placeId || `poly-${place.lat}-${place.lng}`
      const el = createSearchResultMarkerElement(place)
      applyPlaceMarkerSelected(el, place.placeId, selectedPlaceId)
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
      if (onPlaceClick || onMapClick) {
        el.style.cursor = 'pointer'
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          if (addPlaceModeRef.current && onMapClickRef.current) {
            emitAddPlaceMapPick(place.lat, place.lng)
            return
          }
          if (onPlaceClick) onPlaceClick(placeFromSearchMarker(place))
        })
      } else {
        const addrSubtitle = place.address && typeof place.address === 'object'
          ? (formatAddressSubtitle(place.address) || [place.address.road, place.address.city, place.address.state].filter(Boolean).join(', '))
          : ''
        const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
          `<div class="p-2 min-w-[140px]"><strong class="text-slate-800">${escapeHtml(place.displayName || place.name || 'Place')}</strong>${addrSubtitle ? `<div class="text-xs text-slate-600 mt-1">${escapeHtml(addrSubtitle)}</div>` : ''}</div>`
        )
        marker.setPopup(popup)
      }
      marker.addTo(mapRef.current)
      polygonOverlayMarkersRef.current[key] = marker
    })

    return () => {
      Object.values(polygonOverlayMarkersRef.current).forEach((m) => m?.remove())
      polygonOverlayMarkersRef.current = {}
    }
  }, [mapLoaded, polygonOverlayPlaces, onPlaceClick, onMapClick, selectedPlaceId, emitAddPlaceMapPick])

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
    const strictOneShotRead = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 25000,
    }

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

      // One-time auto center on first valid location fix when app opens.
      // After this, we keep updating the marker but avoid re-centering the map again.
      if (map && !hasFlownToUserRef.current) {
        hasFlownToUserRef.current = true
        if (initialFlyFallbackTimerRef.current != null) {
          clearTimeout(initialFlyFallbackTimerRef.current)
          initialFlyFallbackTimerRef.current = null
        }
        map.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          duration: 1200,
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
    navigator.geolocation.getCurrentPosition(applyPosition, () => {}, strictOneShotRead)
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
        zoom: 16,
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
    }
    // updateUserLocation: stable useCallback below; omit from deps (declared after this hook)
  }, [mapLoaded, onLocationUpdate])

  // Update user location marker
  const updateUserLocation = useCallback((location, isHighAccuracy) => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => {
        updateUserLocation(location, isHighAccuracy)
      })
      return
    }

    const { lat, lng, accuracy } = location

    // Remove existing marker and circle
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
    }
    if (map.getLayer(ACCURACY_CIRCLE_LAYER_ID)) {
      map.removeLayer(ACCURACY_CIRCLE_LAYER_ID)
    }
    if (map.getSource(ACCURACY_CIRCLE_SOURCE_ID)) {
      map.removeSource(ACCURACY_CIRCLE_SOURCE_ID)
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
      .addTo(map)

    // Create accuracy circle
    if (accuracy) {
      const radius = Math.min(accuracy, 100) // Cap at 100m for display
      map.addSource(ACCURACY_CIRCLE_SOURCE_ID, {
        type: 'geojson',
        data: createCircleGeoJson(lng, lat, radius),
      })
      map.addLayer({
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
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => {
        drawRoute(routeData, options)
      })
      return
    }
    const feature = toFeatureGeometry(routeData)
    if (!feature) return

    const shouldFitBounds = options.fitBounds !== false
    const lineColor = options.color || '#136AEC'
    const lineDash = options.dashArray || null

    // Remove existing route
    if (map.getLayer('route')) {
      map.removeLayer('route')
    }
    if (map.getLayer('route-hit')) {
      map.removeLayer('route-hit')
    }
    if (map.getSource('route')) {
      map.removeSource('route')
    }

    // Add route source
    map.addSource('route', {
      type: 'geojson',
      data: feature,
    })

    // Invisible but wider hit target for drag interactions.
    map.addLayer({
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

    map.addLayer({
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
      map.fitBounds(bounds, {
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
      const map = mapRef.current
      if (!map?.isStyleLoaded?.()) return
      if (map.getLayer('route')) {
        map.removeLayer('route')
      }
      if (map.getLayer('route-hit')) {
        map.removeLayer('route-hit')
      }
      if (map.getSource('route')) {
        map.removeSource('route')
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
    clearMeasureDistance,
    addMeasurePoint: (lat, lng) => {
      const points = [...measurePointsRef.current, [lng, lat]]
      syncMeasurePath(points)
    },
    getMeasureStats: () => ({
      totalMeters: measureTotalMeters,
      pointCount: measurePointCount,
    }),
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
  }), [clearMeasureDistance, drawRoute, measurePointCount, measureTotalMeters, syncMeasurePath])

  return (
    <div className={`relative w-full h-full ${addPlaceMode || measureDistanceActive ? 'cursor-crosshair' : ''}`}>
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

      {/* Map layers — Street / Satellite / Terrain (Google Maps–style) */}
      {mapLoaded && (
        <div
          className="absolute right-2 sm:right-4 z-10 flex flex-col items-end gap-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6.75rem)' }}
        >
          {layersMenuOpen && (
            <div className="glass rounded-xl shadow-xl p-3 w-[10.5rem] border border-white/40">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Map type</p>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'street', label: 'Default', sub: 'Standard map' },
                  { id: 'satellite', label: 'Satellite', sub: 'Imagery + labels' },
                  { id: 'terrain', label: 'Terrain', sub: 'Topographic' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setBasemapMode(opt.id)
                      setLayersMenuOpen(false)
                    }}
                    className={`rounded-lg px-2.5 py-2 text-left transition-colors ${
                      basemapMode === opt.id
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'hover:bg-white/70 text-slate-800'
                    }`}
                  >
                    <span className="text-sm font-semibold block leading-tight">{opt.label}</span>
                    <span
                      className={`text-[10px] leading-tight block mt-0.5 ${
                        basemapMode === opt.id ? 'text-primary-100' : 'text-slate-500'
                      }`}
                    >
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setLayersMenuOpen((o) => !o)}
            title="Map layers"
            aria-expanded={layersMenuOpen}
            className="glass rounded-lg shadow-lg p-2.5 hover:bg-white/80 active:scale-95 transition-all border border-white/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
              <path d="M22 17.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
              <path d="M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
            </svg>
          </button>
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
