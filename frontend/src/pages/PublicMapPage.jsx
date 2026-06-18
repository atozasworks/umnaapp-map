/**
 * Public Map Viewer (UMNAAPP Maps Platform).
 *
 * Standalone login-free map at `/embedded-map` and `maps.*` hosts.
 * Uses the same label layout and search suggestions as the main UMNAAPP map.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { io } from 'socket.io-client'
import { getApiOrigin } from '../utils/apiBase'
import { formatSearchSuggestion } from '../utils/formatAddress'
import { resolvePlaceRendering } from '../utils/mapRenderingConfig'
import {
  applyMarkerLabelState,
  collectMapLabelReservedRects,
  computeLabelSafeBounds,
  layoutUserPlaceLabels,
  resolveUserPlaceLabelCap,
  setMarkerLabelMeasureMode,
} from '../utils/userPlaceLabelLayout'

const USER_PLACE_LABEL_ZOOM_START = 10
const USER_PLACE_LABEL_ZOOM_FULL = 12.5
const USER_PLACE_LABEL_MIN_ZOOM = 11
const USER_PLACE_SHOW_ALL_NAMES_ZOOM = 14

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

const ACCURACY_CIRCLE_SOURCE_ID = 'user-accuracy-circle-source'
const ACCURACY_CIRCLE_LAYER_ID = 'user-accuracy-circle-layer'

function createCircleGeoJson(centerLng, centerLat, radiusMeters, points = 64) {
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
    geometry: { type: 'Polygon', coordinates: [coordinates] },
    properties: {},
  }
}

function userPlaceLabelOpacity(zoom) {
  const z = Number(zoom)
  if (!Number.isFinite(z) || z <= USER_PLACE_LABEL_ZOOM_START) return 0
  if (z >= USER_PLACE_LABEL_ZOOM_FULL) return 1
  return (z - USER_PLACE_LABEL_ZOOM_START) / (USER_PLACE_LABEL_ZOOM_FULL - USER_PLACE_LABEL_ZOOM_START)
}

function userPlaceLabelPriority(place, mapZoom) {
  const render = resolvePlaceRendering(place, mapZoom)
  let p = render.priority
  const cat = place?.category
  if (cat && LABEL_PRIORITY_CATEGORY_BOOST[cat]) p += LABEL_PRIORITY_CATEGORY_BOOST[cat]
  const zl = Number(place?.zoomLevel)
  if (Number.isFinite(zl) && mapZoom + 0.5 >= zl) p += 8
  return p
}

function getPlaceDisplayName(place) {
  return (
    (place?.place_name_local && String(place.place_name_local).trim()) ||
    (place?.name && String(place.name).trim()) ||
    (place?.place_name_en && String(place.place_name_en).trim()) ||
    (place?.displayName && String(place.displayName).trim()) ||
    'Place'
  )
}

/** DOM marker matching main app structure (label + anchor for collision layout). */
function createPublicPlaceMarkerElement(place, mapZoom) {
  const render = resolvePlaceRendering(place, mapZoom)
  const baseName = getPlaceDisplayName(place)
  const isFestival = place?.category === 'Festival'
  const displayName = isFestival ? `🎪 ${baseName}` : baseName

  const wrapper = document.createElement('div')
  wrapper.className = 'user-place-marker'
  if (isFestival) wrapper.classList.add('user-place-marker--festival')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'flex-end'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.opacity = '0'
  wrapper.style.textAlign = 'center'
  wrapper.dataset.labelPlacement = 'top'
  wrapper.dataset.renderPriority = String(render.priority ?? 50)

  const label = document.createElement('div')
  label.className = 'user-place-marker-label'
  label.textContent = displayName
  label.style.display = 'none'

  const anchor = document.createElement('div')
  anchor.className = 'user-place-marker-anchor'
  anchor.setAttribute('aria-hidden', 'true')
  anchor.style.display = 'none'

  wrapper.appendChild(label)
  wrapper.appendChild(anchor)
  wrapper.title = displayName
  return wrapper
}

function readParams() {
  const sp = new URLSearchParams(window.location.search)
  const num = (k) => (sp.get(k) != null ? parseFloat(sp.get(k)) : null)
  return {
    embed: sp.get('embed') === '1',
    lat: num('lat'),
    lng: num('lng'),
    zoom: num('zoom'),
    categories: (sp.get('categories') || '').split(',').map((c) => c.trim()).filter(Boolean),
    q: sp.get('q') || '',
    place: sp.get('place') || '',
    showSearch: sp.get('search') !== '0',
    showControls: sp.get('controls') !== '0',
    hasExplicitCenter: num('lat') != null && num('lng') != null,
    autoLocate: sp.get('locate') !== '0',
  }
}

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
}

export default function PublicMapPage() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerEntriesRef = useRef([])
  const collisionRafRef = useRef(null)
  const placesRef = useRef(new Map())
  const popupRef = useRef(null)
  const openPlacePopupRef = useRef(null)
  const showSearchPopupRef = useRef(null)
  const socketRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const searchBoxRef = useRef(null)
  const userMarkerRef = useRef(null)
  const watchIdRef = useRef(null)
  const lastValidLocationRef = useRef(null)
  const currentLocationRef = useRef(null)
  const hasFlownToUserRef = useRef(false)
  const initialFlyFallbackTimerRef = useRef(null)
  const paramsRef = useRef(readParams())
  const categoriesRef = useRef(paramsRef.current.categories)

  const [searchValue, setSearchValue] = useState(paramsRef.current.q)
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [upstreamUnavailable, setUpstreamUnavailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('acquiring')
  const [locationError, setLocationError] = useState(null)

  const apiBase = '/api/public'

  const fetchJSON = useCallback(async (path, params) => {
    const usp = new URLSearchParams()
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      usp.set(k, Array.isArray(v) ? v.join(',') : v)
    })
    const url = `${apiBase}${path}${usp.toString() ? `?${usp}` : ''}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }, [])

  const runLabelLayout = useCallback(() => {
    const map = mapRef.current
    const entries = markerEntriesRef.current
    if (!map || !entries.length) return

    const z = map.getZoom()
    const mapBounds = map.getBounds()
    const showAllNames = z >= USER_PLACE_SHOW_ALL_NAMES_ZOOM
    const candidateKeys = new Set()
    const layoutCandidates = []

    entries.forEach(({ key, marker, place }) => {
      const liveRender = resolvePlaceRendering(place, z)
      if (!liveRender.visible) {
        applyMarkerLabelState(marker, { labelOn: false })
        return
      }
      const lat = place.latitude ?? place.lat
      const lng = place.longitude ?? place.lng
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !mapBounds.contains([lng, lat])) {
        applyMarkerLabelState(marker, { labelOn: false })
        return
      }
      const op = userPlaceLabelOpacity(z)
      const el = marker.getElement?.()
      if (el) el.style.opacity = String(op)
      if (op < 0.02) {
        applyMarkerLabelState(marker, { labelOn: false })
        return
      }
      if (z >= USER_PLACE_LABEL_MIN_ZOOM) {
        candidateKeys.add(key)
        layoutCandidates.push({ key, marker, place, priority: userPlaceLabelPriority(place, z) })
      } else {
        applyMarkerLabelState(marker, { labelOn: false })
      }
    })

    if (!layoutCandidates.length) return

    layoutCandidates.forEach(({ marker }) => setMarkerLabelMeasureMode(marker, true))

    const reservedRects = collectMapLabelReservedRects()
    const safeBounds = computeLabelSafeBounds(containerRef.current, reservedRects)
    const maxLabels = showAllNames
      ? layoutCandidates.length
      : resolveUserPlaceLabelCap(z, layoutCandidates.length)

    const winners = layoutUserPlaceLabels(layoutCandidates, {
      zoom: z,
      maxLabels,
      reservedRects,
      safeBounds,
    })

    entries.forEach(({ key, marker }) => {
      if (!candidateKeys.has(key)) return
      const win = winners.get(key)
      if (win) {
        applyMarkerLabelState(marker, { labelOn: true, placement: win.placement })
        const el = marker.getElement?.()
        if (el) el.style.pointerEvents = 'auto'
      } else {
        applyMarkerLabelState(marker, { labelOn: false })
      }
    })
  }, [])

  const scheduleLabelLayout = useCallback(() => {
    if (collisionRafRef.current != null) cancelAnimationFrame(collisionRafRef.current)
    collisionRafRef.current = requestAnimationFrame(() => {
      collisionRafRef.current = null
      requestAnimationFrame(runLabelLayout)
    })
  }, [runLabelLayout])

  const syncMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    markerEntriesRef.current.forEach(({ marker }) => marker.remove())
    markerEntriesRef.current = []

    const bounds = map.getBounds()
    const zoom = map.getZoom()
    const inView = [...placesRef.current.values()].filter(
      (p) =>
        Number.isFinite(p.latitude ?? p.lat) &&
        Number.isFinite(p.longitude ?? p.lng) &&
        bounds.contains([p.longitude ?? p.lng, p.latitude ?? p.lat])
    )

    inView.forEach((place, index) => {
      const lat = place.latitude ?? place.lat
      const lng = place.longitude ?? place.lng
      const el = createPublicPlaceMarkerElement(place, zoom)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        const id = place.id ?? place.placeId
        if (id && isUuid(id)) {
          openPlacePopupRef.current?.(id, [lng, lat])
        } else {
          showSearchPopupRef.current?.(place, [lng, lat])
        }
      })
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map)
      const key = `p-${index}-${place.id ?? place.placeId ?? 'noid'}-${lng}-${lat}`
      markerEntriesRef.current.push({ key, marker, place })
    })

    scheduleLabelLayout()
  }, [scheduleLabelLayout])

  const upsertPlace = useCallback(
    (place) => {
      if (!place?.id) return
      placesRef.current.set(place.id, place)
      syncMarkers()
    },
    [syncMarkers]
  )

  const removePlace = useCallback(
    (id) => {
      if (placesRef.current.delete(id)) syncMarkers()
    },
    [syncMarkers]
  )

  const loadPlacesInView = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    setLoading(true)
    try {
      const data = await fetchJSON('/places', {
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
        categories: categoriesRef.current,
        limit: 500,
      })
      ;(data.places || []).forEach((p) => placesRef.current.set(p.id, p))
      syncMarkers()
    } catch {
      /* keep existing markers */
    } finally {
      setLoading(false)
    }
  }, [fetchJSON, syncMarkers])

  const postToParent = useCallback((event, payload) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ __umna: true, event, payload }, '*')
    }
  }, [])

  const showSearchResultPopup = useCallback(
    (result, lngLat) => {
      const map = mapRef.current
      if (!map) return
      const { title, subtitle } = formatSearchSuggestion(result)
      postToParent('placeClick', result)
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:240px">
          <div style="font-weight:600;font-size:14px;margin-bottom:2px">${escapeHtml(title)}</div>
          ${subtitle ? `<div style="color:#555;font-size:12px;margin-bottom:4px">${escapeHtml(subtitle)}</div>` : ''}
          <div style="margin-top:6px">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${result.lat ?? result.latitude},${result.lng ?? result.longitude}" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb">Directions →</a>
          </div>
        </div>`
      if (popupRef.current) popupRef.current.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, offset: 12 })
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map)
    },
    [postToParent]
  )
  showSearchPopupRef.current = showSearchResultPopup

  const openPlacePopup = useCallback(
    async (id, lngLat) => {
      const map = mapRef.current
      if (!map) return
      let place = placesRef.current.get(id)
      if (isUuid(id)) {
        try {
          const data = await fetchJSON(`/place/${encodeURIComponent(id)}`)
          if (data.place) place = data.place
        } catch {
          /* use cached */
        }
      }
      if (!place) return
      postToParent('placeClick', place)

      const displayName = getPlaceDisplayName(place)
      const addr =
        place.full_address ||
        [place.village, place.taluk, place.district, place.state].filter(Boolean).join(', ')
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:240px">
          <div style="font-weight:600;font-size:14px;margin-bottom:2px">${escapeHtml(displayName)}</div>
          <div style="color:#2563eb;font-size:12px;margin-bottom:4px">${escapeHtml(place.category || '')}</div>
          ${addr ? `<div style="color:#555;font-size:12px;margin-bottom:4px">${escapeHtml(addr)}</div>` : ''}
          ${place.phone ? `<div style="font-size:12px">📞 ${escapeHtml(place.phone)}</div>` : ''}
          ${place.website ? `<div style="font-size:12px"><a href="${escapeAttr(place.website)}" target="_blank" rel="noopener">Website</a></div>` : ''}
          <div style="margin-top:6px">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb">Directions →</a>
          </div>
        </div>`
      if (popupRef.current) popupRef.current.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, offset: 12 })
        .setLngLat(lngLat || [place.longitude, place.latitude])
        .setHTML(html)
        .addTo(map)
    },
    [fetchJSON, postToParent]
  )
  openPlacePopupRef.current = openPlacePopup

  const updateUserLocation = useCallback((location) => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) {
      map.once('load', () => updateUserLocation(location))
      return
    }

    const { lat, lng, accuracy } = location
    currentLocationRef.current = { lat, lng, accuracy }
    setCurrentLocation({ lat, lng, accuracy })

    if (userMarkerRef.current) userMarkerRef.current.remove()
    if (map.getLayer(ACCURACY_CIRCLE_LAYER_ID)) map.removeLayer(ACCURACY_CIRCLE_LAYER_ID)
    if (map.getSource(ACCURACY_CIRCLE_SOURCE_ID)) map.removeSource(ACCURACY_CIRCLE_SOURCE_ID)

    const el = document.createElement('div')
    el.className = 'user-marker'
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#136AEC'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)'

    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map)

    if (accuracy) {
      const radius = Math.min(accuracy, 100)
      map.addSource(ACCURACY_CIRCLE_SOURCE_ID, {
        type: 'geojson',
        data: createCircleGeoJson(lng, lat, radius),
      })
      map.addLayer({
        id: ACCURACY_CIRCLE_LAYER_ID,
        type: 'fill',
        source: ACCURACY_CIRCLE_SOURCE_ID,
        paint: { 'fill-color': '#136AEC', 'fill-opacity': 0.2 },
      })
    }
  }, [])

  const locateMe = useCallback(() => {
    const map = mapRef.current
    if (!map || !navigator.geolocation) return

    const flyAndMark = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const acc = Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 150
        updateUserLocation({ lat: latitude, lng: longitude, accuracy: acc })
      }
      map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16, duration: 800 })
      setLocationError(null)
    }

    navigator.geolocation.getCurrentPosition(flyAndMark, () => {
      navigator.geolocation.getCurrentPosition(flyAndMark, () => {
        const loc = currentLocationRef.current
        if (loc) map.flyTo({ center: [loc.lng, loc.lat], zoom: 16, duration: 800 })
      }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 60000 })
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 })
  }, [updateUserLocation])

  // Debounced search — umnaapp.in/search via /api/public/search (location-biased)
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    const term = searchValue.trim()
    if (term.length < 2) {
      setSearchResults([])
      setShowResults(false)
      setUpstreamUnavailable(false)
      return
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      setUpstreamUnavailable(false)
      try {
        const loc = currentLocationRef.current
        const map = mapRef.current
        const c = loc ?? map?.getCenter()
        const data = await fetchJSON('/search', {
          q: term,
          limit: 15,
          lat: c?.lat,
          lng: c?.lng,
          radiusKm: loc ? 50 : undefined,
        })
        setSearchResults(data.results || [])
        setUpstreamUnavailable(Boolean(data.upstreamUnavailable))
        setShowResults(true)
      } catch {
        setSearchResults([])
        setShowResults(true)
        setUpstreamUnavailable(false)
      } finally {
        setIsSearching(false)
      }
    }, 250)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchValue, fetchJSON])

  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const goToResult = useCallback(
    (result) => {
      const lat = result.latitude ?? result.lat
      const lng = result.longitude ?? result.lng
      const map = mapRef.current
      if (map) map.flyTo({ center: [lng, lat], zoom: 16 })

      const { title } = formatSearchSuggestion(result)
      setSearchValue(title)
      setSearchResults([])
      setShowResults(false)

      const id = result.placeId ?? result.id
      if ((result.isDbPlace || result.isPersisted) && id && isUuid(id)) {
        const normalized = {
          ...result,
          id,
          latitude: lat,
          longitude: lng,
          name: title,
        }
        placesRef.current.set(id, normalized)
        syncMarkers()
        openPlacePopup(id, [lng, lat])
      } else {
        showSearchResultPopup(result, [lng, lat])
      }
    },
    [openPlacePopup, showSearchResultPopup, syncMarkers]
  )

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const params = paramsRef.current

    const start = async () => {
      let config = null
      try {
        config = await fetchJSON('/config')
      } catch {
        config = null
      }
      const tileUrl = config?.tiles?.url || '/api/map/tiles/{z}/{x}/{y}.png'
      const fallbackTileUrl =
        config?.tiles?.fallbackUrl || 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
      const center = [
        params.lng ?? config?.defaultCenter?.lng ?? 77.5946,
        params.lat ?? config?.defaultCenter?.lat ?? 12.9716,
      ]
      const zoom = params.zoom ?? config?.defaultZoom ?? 12

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            basemap: {
              type: 'raster',
              tiles: [toAbsolute(tileUrl), toAbsolute(fallbackTileUrl)].filter(Boolean),
              tileSize: 256,
              maxzoom: config?.tiles?.maxZoom || 19,
              attribution: config?.tiles?.attribution || '© UMNAAPP · OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
        },
        center,
        zoom,
        attributionControl: true,
      })
      mapRef.current = map

      if (params.showControls) {
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
      }

      map.on('load', () => {
        setMapLoaded(true)
        loadPlacesInView()
        if (params.place) openPlacePopupRef.current?.(params.place)
        postToParent('ready', { origin: window.location.origin })
      })

      map.on('zoom', () => {
        markerEntriesRef.current.forEach(({ marker, place }) => {
          const el = marker.getElement?.()
          if (!el) return
          el.style.opacity = String(userPlaceLabelOpacity(map.getZoom()))
        })
      })

      let moveTimer = null
      map.on('moveend', () => {
        clearTimeout(moveTimer)
        moveTimer = setTimeout(() => {
          loadPlacesInView()
          scheduleLabelLayout()
          const c = map.getCenter()
          postToParent('moveend', { lat: c.lat, lng: c.lng, zoom: map.getZoom() })
        }, 300)
      })
    }

    start()

    return () => {
      markerEntriesRef.current.forEach(({ marker }) => marker.remove())
      markerEntriesRef.current = []
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const socket = io(`${getApiOrigin()}/public-maps`, { transports: ['websocket', 'polling'], reconnection: true })
    socketRef.current = socket
    const onUpsert = (msg) => msg?.place && upsertPlace(msg.place)
    const onRemove = (msg) => msg?.place?.id && removePlace(msg.place.id)
    socket.on('place:created', onUpsert)
    socket.on('place:approved', onUpsert)
    socket.on('place:updated', onUpsert)
    socket.on('place:deleted', onRemove)
    return () => {
      socket.off('place:created', onUpsert)
      socket.off('place:approved', onUpsert)
      socket.off('place:updated', onUpsert)
      socket.off('place:deleted', onRemove)
      socket.disconnect()
    }
  }, [upsertPlace, removePlace])

  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.data
      if (!msg || msg.__umna !== true || !msg.command) return
      const map = mapRef.current
      const p = msg.payload || {}
      switch (msg.command) {
        case 'setCenter':
          if (map && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
            map.flyTo({ center: [p.lng, p.lat], zoom: p.zoom ?? map.getZoom() })
          }
          break
        case 'setCategories':
          categoriesRef.current = Array.isArray(p.categories) ? p.categories : []
          placesRef.current.clear()
          loadPlacesInView()
          break
        case 'search':
          setSearchValue(p.q || '')
          break
        case 'selectPlace':
          if (p.id) openPlacePopup(p.id)
          break
        default:
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [loadPlacesInView, openPlacePopup])

  // Watch GPS — blue dot + auto-center when URL has no explicit lat/lng
  useEffect(() => {
    if (!mapLoaded || !navigator.geolocation) return
    const params = paramsRef.current
    const shouldAutoFly = params.autoLocate && !params.hasExplicitCenter

    const applyPosition = (position) => {
      const { latitude, longitude, accuracy } = position.coords
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

      const acc = Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 150
      const location = { lat: latitude, lng: longitude, accuracy: acc }
      lastValidLocationRef.current = location
      setLocationError(null)
      setGpsStatus(acc <= 15 ? 'high' : acc <= 80 ? 'acquiring' : 'weak')
      updateUserLocation(location)

      const map = mapRef.current
      if (shouldAutoFly && map && !hasFlownToUserRef.current) {
        hasFlownToUserRef.current = true
        if (initialFlyFallbackTimerRef.current != null) {
          clearTimeout(initialFlyFallbackTimerRef.current)
          initialFlyFallbackTimerRef.current = null
        }
        map.flyTo({ center: [longitude, latitude], zoom: 16, duration: 1200 })
      }
    }

    const handleWatchError = (error) => {
      if (error.code === error.TIMEOUT && lastValidLocationRef.current) {
        setGpsStatus('weak')
        return
      }
      setGpsStatus('weak')
      if (error.code === error.PERMISSION_DENIED) {
        setLocationError('Location access denied. Enable location to see your position.')
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setLocationError('Location unavailable. Tap the target button to retry.')
      }
    }

    navigator.geolocation.getCurrentPosition(applyPosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 25000,
    })
    navigator.geolocation.getCurrentPosition(applyPosition, () => {}, {
      enableHighAccuracy: false,
      maximumAge: 60000,
      timeout: 45000,
    })
    watchIdRef.current = navigator.geolocation.watchPosition(applyPosition, handleWatchError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 60000,
    })

    if (shouldAutoFly) {
      initialFlyFallbackTimerRef.current = setTimeout(() => {
        initialFlyFallbackTimerRef.current = null
        const map = mapRef.current
        const loc = lastValidLocationRef.current
        if (!map || !loc || hasFlownToUserRef.current) return
        hasFlownToUserRef.current = true
        map.flyTo({ center: [loc.lng, loc.lat], zoom: 16, duration: 1000 })
      }, 14000)
    }

    return () => {
      if (initialFlyFallbackTimerRef.current != null) {
        clearTimeout(initialFlyFallbackTimerRef.current)
        initialFlyFallbackTimerRef.current = null
      }
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [mapLoaded, updateUserLocation])

  const showSearch = paramsRef.current.showSearch
  const showControls = paramsRef.current.showControls

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {showSearch && (
        <div
          ref={searchBoxRef}
          data-map-ui-chrome
          className="absolute top-3 left-3 z-20 w-[min(360px,calc(100%-24px))]"
        >
          <div className="relative w-full">
            <div className="flex items-center gap-2 glass rounded-full pl-3 pr-3 py-2 shadow-lg border border-white/30 min-h-[48px]">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Search places…"
                className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-slate-700 placeholder-slate-500 text-base sm:text-sm py-1"
              />
              {isSearching ? (
                <div className="flex-shrink-0 animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent" />
              ) : (
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 glass rounded-xl shadow-2xl border border-white/30 max-h-[min(60vh,320px)] overflow-y-auto overscroll-contain">
                {upstreamUnavailable && (
                  <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50/80 border-b border-amber-200/60">
                    Geocoding service unavailable. Showing saved places only.
                  </div>
                )}
                {searchResults.map((result) => {
                  const { title, subtitle } = formatSearchSuggestion(result)
                  const key = result.placeId ?? `${result.lat}-${result.lng}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => goToResult(result)}
                      className="w-full text-left px-4 py-3 border-b border-white/20 last:border-b-0 hover:bg-white/40 active:bg-white/50 transition-colors"
                    >
                      <div className="font-medium text-slate-700 truncate">{title}</div>
                      {subtitle ? (
                        <div className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</div>
                      ) : result.category ? (
                        <div className="text-xs text-slate-500 truncate mt-0.5">{result.category}</div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}

            {showResults && searchValue.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 glass rounded-xl shadow-2xl border border-white/30 px-4 py-3 text-sm text-slate-500">
                No places found
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/90 px-2.5 py-1 rounded-xl text-xs text-slate-600">
          Loading…
        </div>
      )}

      {mapLoaded && showControls && (
        <button
          type="button"
          onClick={locateMe}
          title="Go to my location"
          className="absolute right-3 glass rounded-lg shadow-lg z-10 p-2.5 hover:bg-white/80 active:scale-95 transition-all border border-white/30"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={currentLocation ? '#136AEC' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
      )}

      {mapLoaded && currentLocation && (
        <div
          className="absolute left-3 glass rounded-lg p-2.5 shadow-lg z-10 max-w-[calc(100vw-1rem)]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                gpsStatus === 'high' ? 'bg-green-500' : gpsStatus === 'acquiring' ? 'bg-yellow-500' : 'bg-orange-500'
              } animate-pulse`}
            />
            <span className="text-xs font-medium text-slate-700">
              {gpsStatus === 'high' ? 'Your location' : gpsStatus === 'acquiring' ? 'Acquiring GPS…' : 'Approximate location'}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600 font-mono">
            {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </div>
        </div>
      )}

      {locationError && (
        <div className="absolute top-20 left-3 right-3 glass rounded-lg p-3 shadow-lg z-10 max-w-sm">
          <p className="text-xs text-slate-600">{locationError}</p>
        </div>
      )}
    </div>
  )
}

function toAbsolute(urlTemplate) {
  if (!urlTemplate) return urlTemplate
  if (/^https?:\/\//i.test(urlTemplate)) return urlTemplate
  return `${window.location.origin}${urlTemplate.startsWith('/') ? '' : '/'}${urlTemplate}`
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c])
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;')
}
