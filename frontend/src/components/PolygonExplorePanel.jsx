import { useCallback, useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import api from '../services/api'
import { PLACE_CATEGORIES } from './AddPlaceModal'
import { CATEGORY_NAME_KEYWORDS, resolvePlaceCategory } from '../utils/googlePlaceCategory'
import {
  pointInRing,
  closeRing,
  circlePolygon,
  rectangleFromCorners,
  squareFromCorners,
  decimateRingMeters,
} from '../utils/polygonGeo'
import { applyAreaExploreFeature } from '../utils/areaExploreMapLayers'
import TranslatedLabel from './TranslatedLabel'

const CATEGORY_MARKER = {
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

function centroidOfRing(ring) {
  const r =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring
  let sx = 0
  let sy = 0
  for (const [lng, lat] of r) {
    sx += lng
    sy += lat
  }
  const n = r.length || 1
  return { lng: sx / n, lat: sy / n }
}

function haversineLikeMeters(a, b) {
  const latRad = (a[1] * Math.PI) / 180
  const mx = 111320 * Math.cos(latRad || 0.0001)
  const my = 111320
  const dx = (b[0] - a[0]) * mx
  const dy = (b[1] - a[1]) * my
  return Math.sqrt(dx * dx + dy * dy)
}

function screenDist(map, a, b) {
  const pa = map.project(a)
  const pb = map.project(b)
  return Math.hypot(pa.x - pb.x, pa.y - pb.y)
}

/**
 * @param {object} props
 * @param {import('react').RefObject<any>} props.mapRef
 * @param {number} [props.mapReadyTick] bump when MapLibre finishes initial load
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {(active: boolean) => void} props.onInteractionChange
 * @param {(feature: object | null) => void} props.onShapeChange
 * @param {(place: object) => void} [props.onPlaceSelect]
 * @param {(places: object[], count: number) => void} props.onPlacesFound
 * @param {() => void} props.onClearPlaces
 */
export default function PolygonExplorePanel({
  mapRef,
  mapReadyTick = 0,
  isOpen,
  onClose,
  onInteractionChange,
  onShapeChange,
  onPlaceSelect,
  onPlacesFound,
  onClearPlaces,
}) {
  const [visible, setVisible] = useState(isOpen)
  const [entered, setEntered] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [shapeTool, setShapeTool] = useState('polygon')
  const [drawPhase, setDrawPhase] = useState('idle')
  const [completedFeature, setCompletedFeature] = useState(null)
  const [showCategories, setShowCategories] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [areaPlaceCount, setAreaPlaceCount] = useState(null)
  const [areaPlacesList, setAreaPlacesList] = useState([])

  const phaseRef = useRef('idle')
  const toolRef = useRef('polygon')
  const pointsRef = useRef([])
  const startRef = useRef(null)
  const freehandRef = useRef([])
  const rafRef = useRef(null)
  const vertexMarkersRef = useRef([])
  const lastPointerRef = useRef(null)
  const completedFeatureRef = useRef(null)
  const onShapeChangeRef = useRef(onShapeChange)
  onShapeChangeRef.current = onShapeChange

  const emitShapeChange = useCallback((feature) => {
    // Draw directly on the map for instant feedback (no React round-trip lag
    // while dragging), then sync parent state so the shape persists across
    // basemap / style changes.
    const map = mapRef.current?.getMap?.()
    if (map) applyAreaExploreFeature(map, feature ?? null)
    onShapeChangeRef.current?.(feature ?? null)
  }, [mapRef])

  useEffect(() => {
    completedFeatureRef.current = completedFeature
  }, [completedFeature])

  useEffect(() => {
    toolRef.current = shapeTool
  }, [shapeTool])

  useEffect(() => {
    phaseRef.current = drawPhase
  }, [drawPhase])

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setIsExiting(false)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    }
    if (!visible) return undefined
    setEntered(false)
    setIsExiting(true)
    const timer = setTimeout(() => {
      setVisible(false)
      setIsExiting(false)
    }, 280)
    return () => clearTimeout(timer)
  }, [isOpen, visible])

  const handleClose = useCallback(() => {
    if (isExiting) return
    setEntered(false)
    setIsExiting(true)
    setTimeout(() => {
      setVisible(false)
      setIsExiting(false)
      onClose?.()
    }, 280)
  }, [isExiting, onClose])

  const clearVertexMarkers = useCallback(() => {
    vertexMarkersRef.current.forEach((m) => m.remove())
    vertexMarkersRef.current = []
  }, [])

  const teardownDrawing = useCallback(
    (map) => {
      if (!map) return
      try {
        map.getCanvas().style.cursor = ''
      } catch {
        /* ignore */
      }
      try {
        if (map.dragPan?.isEnabled?.() === false) map.dragPan.enable()
      } catch {
        /* ignore */
      }
      try {
        if (map.doubleClickZoom?.isEnabled?.() === false) map.doubleClickZoom.enable()
      } catch {
        /* ignore */
      }
      try {
        if (map.boxZoom?.isEnabled?.() === false) map.boxZoom.enable()
      } catch {
        /* ignore */
      }
      onInteractionChange(false)
    },
    [onInteractionChange]
  )

  const applyPolygonFromOpenRing = useCallback(
    (map, openCoords) => {
      if (!map || openCoords.length < 3) return
      const ring = closeRing(openCoords)
      const feature = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [ring] },
      }
      emitShapeChange(feature)
      setCompletedFeature(feature)
      setShowCategories(true)
      setDrawPhase('idle')
      phaseRef.current = 'idle'
      teardownDrawing(map)
    },
    [teardownDrawing, emitShapeChange]
  )

  const onClearPlacesRef = useRef(onClearPlaces)
  onClearPlacesRef.current = onClearPlaces

  const clearAll = useCallback(() => {
    const map = mapRef.current?.getMap?.()
    setCompletedFeature(null)
    setShowCategories(false)
    setSelectedCategory(null)
    setEditMode(false)
    setAreaPlaceCount(null)
    setAreaPlacesList([])
    setDrawPhase('idle')
    phaseRef.current = 'idle'
    pointsRef.current = []
    startRef.current = null
    freehandRef.current = []
    lastPointerRef.current = null
    clearVertexMarkers()
    emitShapeChange(null)
    if (map) {
      teardownDrawing(map)
    }
    onClearPlacesRef.current?.()
  }, [mapRef, clearVertexMarkers, teardownDrawing, emitShapeChange])

  useEffect(
    () => () => {
      const map = mapRef.current?.getMap?.()
      clearVertexMarkers()
      emitShapeChange(null)
      if (map) {
        teardownDrawing(map)
      }
      onClearPlacesRef.current?.()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on unmount
    []
  )

  const rebuildVertexHandles = useCallback(
    (map, ring) => {
      clearVertexMarkers()
      if (!map || !ring?.length) return
      const open =
        ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
          ? ring.slice(0, -1)
          : ring
      open.forEach((coord, idx) => {
        const el = document.createElement('div')
        el.style.width = '12px'
        el.style.height = '12px'
        el.style.borderRadius = '50%'
        el.style.background = '#4338CA'
        el.style.border = '2px solid white'
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)'
        el.style.cursor = 'grab'
        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(coord)
          .addTo(map)
        marker.on('dragend', () => {
          const ll = marker.getLngLat()
          const next = [...open]
          next[idx] = [ll.lng, ll.lat]
          const closed = closeRing(next)
          const feature = {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [closed] },
          }
          emitShapeChange(feature)
          setCompletedFeature(feature)
          setAreaPlaceCount(null)
          setAreaPlacesList([])
        })
        vertexMarkersRef.current.push(marker)
      })
    },
    [clearVertexMarkers, emitShapeChange]
  )

  useEffect(() => {
    if (!isOpen || !completedFeature) return
    emitShapeChange(completedFeature)
  }, [isOpen, completedFeature, emitShapeChange])

  useEffect(() => {
    if (!isOpen || !completedFeature || !editMode) {
      clearVertexMarkers()
      return undefined
    }
    const map = mapRef.current?.getMap?.()
    if (!map) return undefined
    const ring = completedFeature.geometry?.coordinates?.[0]
    rebuildVertexHandles(map, ring)
    return () => clearVertexMarkers()
  }, [isOpen, completedFeature, editMode, mapRef, rebuildVertexHandles, clearVertexMarkers])

  useEffect(() => {
    if (!isOpen || mapReadyTick === 0) return undefined

    const map = mapRef.current?.getMap?.()
    if (!map) return undefined

    const onPolygonClick = (e) => {
      if (toolRef.current !== 'polygon' || phaseRef.current !== 'drawing') return
      if (e.originalEvent?.target?.closest?.('.maplibregl-marker')) return
      const detail = e.originalEvent?.detail || 0
      const { lng, lat } = e.lngLat
      const pts = pointsRef.current

      if (detail >= 2) {
        if (pts.length >= 3) {
          applyPolygonFromOpenRing(map, pts)
        }
        return
      }

      if (pts.length >= 3 && screenDist(map, [lng, lat], pts[0]) < 14) {
        applyPolygonFromOpenRing(map, pts)
        return
      }
      pts.push([lng, lat])
      const lineCoords = pts.length > 1 ? [...pts, pts[0]] : pts
      emitShapeChange({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: lineCoords },
      })
    }

    const previewRectOrSquare = (end) => {
      const a = startRef.current
      if (!a || !end) return
      const f =
        toolRef.current === 'square'
          ? squareFromCorners(a, [end.lng, end.lat])
          : rectangleFromCorners(a, [end.lng, end.lat])
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        emitShapeChange(f)
      })
    }

    const previewCircle = (end) => {
      const a = startRef.current
      if (!a || !end) return
      const distM = haversineLikeMeters(a, [end.lng, end.lat])
      if (distM < 2) return
      const f = circlePolygon(a[0], a[1], distM)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        emitShapeChange(f)
      })
    }

    const onDown = (e) => {
      const t = toolRef.current
      const ph = phaseRef.current
      if (ph !== 'drawing') return
      if (t === 'polygon') return
      if (e.originalEvent?.target?.closest?.('.maplibregl-marker')) return
      if (e.originalEvent?.type?.startsWith?.('touch')) {
        e.originalEvent.preventDefault()
      }
      lastPointerRef.current = e.lngLat
      if (t === 'freehand') {
        freehandRef.current = [[e.lngLat.lng, e.lngLat.lat]]
        map.dragPan.disable()
        return
      }
      startRef.current = [e.lngLat.lng, e.lngLat.lat]
      map.dragPan.disable()
      map.doubleClickZoom.disable()
    }

    const onMove = (e) => {
      const t = toolRef.current
      const ph = phaseRef.current
      if (ph !== 'drawing') return
      if (t !== 'polygon' && e.originalEvent?.type?.startsWith?.('touch')) {
        e.originalEvent.preventDefault()
      }
      lastPointerRef.current = e.lngLat
      if (t === 'rectangle' || t === 'square') {
        if (!startRef.current) return
        previewRectOrSquare(e.lngLat)
      } else if (t === 'circle') {
        if (!startRef.current) return
        previewCircle(e.lngLat)
      } else if (t === 'freehand' && freehandRef.current.length) {
        const last = freehandRef.current[freehandRef.current.length - 1]
        const next = [e.lngLat.lng, e.lngLat.lat]
        if (screenDist(map, last, next) < 6) return
        freehandRef.current.push(next)
        emitShapeChange({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: freehandRef.current },
        })
      }
    }

    const finishFreehand = () => {
      const raw = freehandRef.current
      freehandRef.current = []
      map.dragPan.enable()
      if (raw.length < 3) {
        emitShapeChange(null)
        return
      }
      const decimated = decimateRingMeters(closeRing(raw), 3)
      const open = decimated.slice(0, -1)
      applyPolygonFromOpenRing(map, open)
    }

    const onUp = (e) => {
      const t = toolRef.current
      const ph = phaseRef.current
      if (ph !== 'drawing') return
      if (t === 'polygon') return
      if (t === 'freehand') {
        finishFreehand()
        return
      }
      map.dragPan.enable()
      map.doubleClickZoom.enable()
      const start = startRef.current
      startRef.current = null
      if (!start) return
      const ll = e.lngLat || lastPointerRef.current
      const end = ll ? [ll.lng, ll.lat] : null
      if (!end) return
      const f =
        t === 'square'
          ? squareFromCorners(start, end)
          : t === 'circle'
            ? circlePolygon(start[0], start[1], Math.max(8, haversineLikeMeters(start, end)))
            : rectangleFromCorners(start, end)
      emitShapeChange(f)
      setCompletedFeature(f)
      setShowCategories(true)
      setDrawPhase('idle')
      phaseRef.current = 'idle'
      teardownDrawing(map)
    }

    const onDocUp = () => {
      if (toolRef.current !== 'freehand' || phaseRef.current !== 'drawing') return
      if (!freehandRef.current.length) return
      finishFreehand()
    }

    const onKey = (ev) => {
      if (ev.key === 'Escape' && phaseRef.current === 'drawing') {
        pointsRef.current = []
        freehandRef.current = []
        startRef.current = null
        emitShapeChange(null)
        setDrawPhase('idle')
        phaseRef.current = 'idle'
        teardownDrawing(map)
      }
    }

    map.on('click', onPolygonClick)
    map.on('mousedown', onDown)
    map.on('mousemove', onMove)
    map.on('mouseup', onUp)
    map.on('touchstart', onDown)
    map.on('touchmove', onMove)
    map.on('touchend', onUp)
    document.addEventListener('mouseup', onDocUp)
    document.addEventListener('touchend', onDocUp)
    window.addEventListener('keydown', onKey)

    return () => {
      map.off('click', onPolygonClick)
      map.off('mousedown', onDown)
      map.off('mousemove', onMove)
      map.off('mouseup', onUp)
      map.off('touchstart', onDown)
      map.off('touchmove', onMove)
      map.off('touchend', onUp)
      document.removeEventListener('mouseup', onDocUp)
      document.removeEventListener('touchend', onDocUp)
      window.removeEventListener('keydown', onKey)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isOpen, mapReadyTick, mapRef, applyPolygonFromOpenRing, teardownDrawing, emitShapeChange])

  const startDrawing = useCallback(() => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    emitShapeChange(null)
    pointsRef.current = []
    startRef.current = null
    freehandRef.current = []
    setShowCategories(false)
    setSelectedCategory(null)
    setCompletedFeature(null)
    setEditMode(false)
    setAreaPlaceCount(null)
    setAreaPlacesList([])
    onClearPlaces()
    setDrawPhase('drawing')
    phaseRef.current = 'drawing'
    onInteractionChange(true)
    map.getCanvas().style.cursor = 'crosshair'
    map.doubleClickZoom?.disable()
  }, [mapRef, onClearPlaces, onInteractionChange, emitShapeChange])

  useEffect(() => {
    if (drawPhase !== 'drawing') return undefined
    const map = mapRef.current?.getMap?.()
    if (!map) return undefined
    return () => {
      map.getCanvas().style.cursor = ''
    }
  }, [drawPhase, mapRef])

  const fetchForCategory = useCallback(
    async (category) => {
      if (!completedFeature?.geometry?.coordinates?.[0]) return
      const ring = completedFeature.geometry.coordinates[0]
      const closed = closeRing(ring)
      setLoadingPlaces(true)
      setSelectedCategory(category)
      setAreaPlacesList([])
      try {
        const { data } = await api.post('/map/places/in-polygon', {
          polygon: completedFeature.geometry,
          category,
        })
        const dbPlaces = Array.isArray(data.places) ? data.places : []
        const dbMarkers = dbPlaces.map((p) => ({
          placeId: p.id,
          displayName: p.place_name_en || p.name,
          lat: p.latitude,
          lng: p.longitude,
          markerColor: CATEGORY_MARKER[p.category] || CATEGORY_MARKER.Other,
          address: {},
          _fromDb: true,
          category: p.category,
        }))

        const { lng: clng, lat: clat } = centroidOfRing(ring)
        const keywords = CATEGORY_NAME_KEYWORDS[category] || []
        const searchQueries = [
          ...new Set([
            category,
            ...keywords.slice(0, 4),
            `${category} near ${clat.toFixed(4)},${clng.toFixed(4)}`,
          ]),
        ]

        let apiMarkers = []
        for (const q of searchQueries) {
          try {
            const { data: s } = await api.get('/map/search-simple', { params: { q } })
            const raw = Array.isArray(s.results) ? s.results : []
            for (const r of raw) {
              if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue
              if (!pointInRing(r.lng, r.lat, closed)) continue
              const resolved = resolvePlaceCategory({
                name: r.displayName || r.name,
                category: r.address?.county,
              })
              if (resolved !== category) continue
              apiMarkers.push({
                placeId: r.placeId || `ext-${r.lat}-${r.lng}`,
                displayName: r.displayName || r.name,
                lat: r.lat,
                lng: r.lng,
                markerColor: CATEGORY_MARKER[category] || '#EA4335',
                address: r.address,
                _fromDb: Boolean(r.isDbPlace),
                category,
              })
            }
          } catch {
            /* optional enrichment per query */
          }
        }

        const seen = new Set()
        const merged = []
        for (const m of [...dbMarkers, ...apiMarkers]) {
          const k = `${Number(m.lat).toFixed(5)}-${Number(m.lng).toFixed(5)}`
          if (seen.has(k)) continue
          seen.add(k)
          merged.push(m)
        }

        merged.sort((a, b) =>
          String(a.displayName || '').localeCompare(String(b.displayName || ''), undefined, {
            sensitivity: 'base',
          })
        )

        setAreaPlaceCount(merged.length)
        setAreaPlacesList(merged)
        onPlacesFound(merged, merged.length)
      } catch (err) {
        console.error(err)
        setAreaPlaceCount(0)
        setAreaPlacesList([])
        onPlacesFound([], 0)
      } finally {
        setLoadingPlaces(false)
      }
    },
    [completedFeature, onPlacesFound]
  )

  if (!visible && !isOpen) return null

  const panelMotion = entered && !isExiting
    ? { transform: 'translateX(0)', opacity: 1 }
    : { transform: 'translateX(calc(-100% - 0.75rem))', opacity: 0 }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="area-explore-title"
      className="absolute z-[28] w-[min(100vw-0.5rem,18rem)] max-h-[calc(100vh-5.5rem-env(safe-area-inset-bottom))] flex flex-col glass rounded-r-2xl border border-white/40 shadow-xl overflow-hidden pointer-events-auto"
      style={{
        top: 'calc(env(safe-area-inset-top) + 3.75rem)',
        left: 0,
        ...panelMotion,
        transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="relative shrink-0 border-b border-white/40 bg-white/50 px-3 py-2.5 pr-12">
        <h2 id="area-explore-title" className="text-sm font-bold text-slate-800 pr-1">Area explore</h2>
        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug pr-1">
          Draw a region, pick a category, then see matching places inside the shape.
        </p>
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2 right-2 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-sm ring-1 ring-slate-200/90 transition-all duration-200 hover:bg-white hover:text-slate-800 hover:shadow active:scale-95 touch-manipulation"
          aria-label="Close Area explore"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Shape</p>
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'polygon', label: 'Polygon' },
            { id: 'rectangle', label: 'Rectangle' },
            { id: 'square', label: 'Square' },
            { id: 'circle', label: 'Circle' },
            { id: 'freehand', label: 'Freehand' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={drawPhase === 'drawing'}
              onClick={() => setShapeTool(t.id)}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition-colors ${
                shapeTool === t.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white/80 text-slate-700 border-slate-200 hover:border-primary-300'
              } disabled:opacity-50`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={startDrawing}
            disabled={drawPhase === 'drawing'}
            className="flex-1 min-w-[7rem] rounded-xl bg-primary-600 text-white text-xs font-semibold py-2 px-2 shadow hover:bg-primary-700 disabled:opacity-50"
          >
            {drawPhase === 'drawing' ? 'Drawing…' : 'Draw on map'}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-slate-200 bg-white/90 text-slate-700 text-xs font-semibold py-2 px-2 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>

        {drawPhase === 'drawing' && (
          <p className="text-[11px] text-slate-600 bg-primary-50/80 rounded-lg px-2 py-1.5">
            {shapeTool === 'polygon' && 'Tap corners; tap first point or double‑click to finish.'}
            {shapeTool === 'rectangle' && 'Drag a corner to opposite corner.'}
            {shapeTool === 'square' && 'Drag to set a square area.'}
            {shapeTool === 'circle' && 'Drag from center outward for radius.'}
            {shapeTool === 'freehand' && 'Hold and draw; release to close the area.'}
            <span className="block mt-1 text-slate-500">Esc cancels.</span>
          </p>
        )}

        {completedFeature && drawPhase !== 'drawing' && (
          <div className="flex gap-1 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => setEditMode((e) => !e)}
              className={`text-[11px] font-semibold rounded-lg px-2 py-1 border ${
                editMode ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {editMode ? 'Done editing' : 'Edit shape'}
            </button>
            <button
              type="button"
              onClick={() => {
                const map = mapRef.current?.getMap?.()
                setCompletedFeature(null)
                setShowCategories(false)
                setSelectedCategory(null)
                setEditMode(false)
                setAreaPlaceCount(null)
                setAreaPlacesList([])
                clearVertexMarkers()
                if (map) emitShapeChange(null)
                onClearPlaces()
              }}
              className="text-[11px] font-semibold rounded-lg px-2 py-1 border border-red-200 text-red-700 bg-white hover:bg-red-50"
            >
              Delete shape
            </button>
          </div>
        )}

        {showCategories && completedFeature && (
          <div className="pt-2 border-t border-slate-200/80">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Category
            </p>
            {areaPlaceCount != null && selectedCategory && (
              <p className="text-xs font-semibold text-primary-700 mb-1">
                {areaPlaceCount} places in area
                {selectedCategory ? ` · ${selectedCategory}` : ''}
              </p>
            )}
            {loadingPlaces && <p className="text-xs text-slate-500 py-2">Loading places…</p>}
            {!loadingPlaces && selectedCategory && areaPlaceCount === 0 && (
              <p className="text-xs text-slate-500 mb-2">
                No {selectedCategory} places found in this area. Try another category or draw a larger shape.
              </p>
            )}
            {areaPlacesList.length > 0 && (
              <ul className="mb-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200/90 bg-white/90 divide-y divide-slate-100">
                {areaPlacesList.map((place) => {
                  const key = place.placeId || `${place.lat}-${place.lng}`
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => {
                          onPlaceSelect?.({
                            id: place.placeId,
                            placeId: place.placeId,
                            displayName: place.displayName,
                            name: place.displayName,
                            latitude: place.lat,
                            longitude: place.lng,
                            lat: place.lat,
                            lng: place.lng,
                            category: place.category || selectedCategory,
                            _fromDb: place._fromDb,
                          })
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-primary-50/80 active:bg-primary-100/80 transition-colors touch-manipulation"
                      >
                        <span className="block text-xs font-semibold text-slate-800 truncate">
                          {place.displayName}
                        </span>
                        {place._fromDb && (
                          <span className="block text-[10px] text-slate-500 mt-0.5">Saved place</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-0.5">
              {PLACE_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={loadingPlaces}
                    onClick={() => fetchForCategory(cat)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'bg-white/90 border-slate-200 text-slate-700 hover:border-primary-300'
                    } disabled:opacity-50`}
                  >
                    <TranslatedLabel text={cat} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
