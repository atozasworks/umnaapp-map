import { useCallback, useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import api from '../services/api'
import { PLACE_CATEGORIES } from './AddPlaceModal'
import {
  pointInRing,
  closeRing,
  circlePolygon,
  rectangleFromCorners,
  squareFromCorners,
  decimateRingMeters,
} from '../utils/polygonGeo'
import { whenStyleReady } from '../utils/mapWhenStyleReady'
import TranslatedLabel from './TranslatedLabel'

const AREA_SOURCE = 'area-explore-draw-src'
const AREA_FILL = 'area-explore-draw-fill'
const AREA_LINE = 'area-explore-draw-line'

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

function ensureAreaLayers(map) {
  if (map.getSource(AREA_SOURCE)) return
  map.addSource(AREA_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: AREA_FILL,
    type: 'fill',
    source: AREA_SOURCE,
    filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
    paint: {
      'fill-color': '#4F46E5',
      'fill-opacity': 0.14,
    },
  })
  map.addLayer({
    id: AREA_LINE,
    type: 'line',
    source: AREA_SOURCE,
    paint: {
      'line-color': '#4338CA',
      'line-width': 2,
      'line-dasharray': [2, 1],
    },
  })
}

function setAreaFeature(map, feature) {
  const src = map.getSource(AREA_SOURCE)
  if (!src) return
  src.setData({
    type: 'FeatureCollection',
    features: feature ? [feature] : [],
  })
}

function screenDist(map, a, b) {
  const pa = map.project(a)
  const pb = map.project(b)
  return Math.hypot(pa.x - pb.x, pa.y - pb.y)
}

/**
 * @param {object} props
 * @param {import('react').RefObject<any>} props.mapRef
 * @param {boolean} props.isOpen
 * @param {(active: boolean) => void} props.onInteractionChange
 * @param {(places: object[], count: number) => void} props.onPlacesFound
 * @param {() => void} props.onClearPlaces
 */
export default function PolygonExplorePanel({
  mapRef,
  isOpen,
  onInteractionChange,
  onPlacesFound,
  onClearPlaces,
}) {
  const [shapeTool, setShapeTool] = useState('polygon')
  const [drawPhase, setDrawPhase] = useState('idle')
  const [completedFeature, setCompletedFeature] = useState(null)
  const [showCategories, setShowCategories] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [areaPlaceCount, setAreaPlaceCount] = useState(null)

  const phaseRef = useRef('idle')
  const toolRef = useRef('polygon')
  const pointsRef = useRef([])
  const startRef = useRef(null)
  const freehandRef = useRef([])
  const rafRef = useRef(null)
  const vertexMarkersRef = useRef([])
  const lastPointerRef = useRef(null)

  useEffect(() => {
    toolRef.current = shapeTool
  }, [shapeTool])

  useEffect(() => {
    phaseRef.current = drawPhase
  }, [drawPhase])

  const clearVertexMarkers = useCallback(() => {
    vertexMarkersRef.current.forEach((m) => m.remove())
    vertexMarkersRef.current = []
  }, [])

  const teardownDrawing = useCallback(
    (map) => {
      if (!map) return
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
      setAreaFeature(map, feature)
      setCompletedFeature(feature)
      setShowCategories(true)
      setDrawPhase('idle')
      phaseRef.current = 'idle'
      teardownDrawing(map)
    },
    [teardownDrawing]
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
    setDrawPhase('idle')
    phaseRef.current = 'idle'
    pointsRef.current = []
    startRef.current = null
    freehandRef.current = []
    lastPointerRef.current = null
    clearVertexMarkers()
    if (map) {
      setAreaFeature(map, null)
      teardownDrawing(map)
    }
    onClearPlacesRef.current?.()
  }, [mapRef, clearVertexMarkers, teardownDrawing])

  useEffect(
    () => () => {
      const map = mapRef.current?.getMap?.()
      clearVertexMarkers()
      if (map) {
        setAreaFeature(map, null)
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
          setAreaFeature(map, feature)
          setCompletedFeature(feature)
          setAreaPlaceCount(null)
        })
        vertexMarkersRef.current.push(marker)
      })
    },
    [clearVertexMarkers]
  )

  useEffect(() => {
    if (!isOpen || !mapRef.current?.getMap?.()) return undefined
    const map = mapRef.current.getMap()
    let disposed = false
    const dispose = whenStyleReady(map, () => {
      if (disposed) return
      ensureAreaLayers(map)
      if (completedFeature) setAreaFeature(map, completedFeature)
    })
    return () => {
      disposed = true
      dispose()
    }
  }, [isOpen, mapRef, completedFeature])

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
    if (!isOpen) return undefined

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
      setAreaFeature(map, {
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
        setAreaFeature(map, f)
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
        setAreaFeature(map, f)
      })
    }

    const onDown = (e) => {
      const t = toolRef.current
      const ph = phaseRef.current
      if (ph !== 'drawing') return
      if (t === 'polygon') return
      if (e.originalEvent?.target?.closest?.('.maplibregl-marker')) return
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
        setAreaFeature(map, {
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
        setAreaFeature(map, null)
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
      const end = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : null
      if (!end) return
      const f =
        t === 'square'
          ? squareFromCorners(start, end)
          : t === 'circle'
            ? circlePolygon(start[0], start[1], Math.max(8, haversineLikeMeters(start, end)))
            : rectangleFromCorners(start, end)
      setAreaFeature(map, f)
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
        setAreaFeature(map, null)
        setDrawPhase('idle')
        phaseRef.current = 'idle'
        teardownDrawing(map)
      }
    }

    map.on('click', onPolygonClick)
    map.on('mousedown', onDown)
    map.on('mousemove', onMove)
    map.on('mouseup', onUp)
    document.addEventListener('mouseup', onDocUp)
    window.addEventListener('keydown', onKey)

    return () => {
      map.off('click', onPolygonClick)
      map.off('mousedown', onDown)
      map.off('mousemove', onMove)
      map.off('mouseup', onUp)
      document.removeEventListener('mouseup', onDocUp)
      window.removeEventListener('keydown', onKey)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isOpen, mapRef, applyPolygonFromOpenRing, teardownDrawing])

  const startDrawing = useCallback(() => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    whenStyleReady(map, () => {
      ensureAreaLayers(map)
      setAreaFeature(map, null)
    })
    pointsRef.current = []
    startRef.current = null
    freehandRef.current = []
    setShowCategories(false)
    setSelectedCategory(null)
    setCompletedFeature(null)
    setEditMode(false)
    setAreaPlaceCount(null)
    onClearPlaces()
    setDrawPhase('drawing')
    phaseRef.current = 'drawing'
    onInteractionChange(true)
    map.doubleClickZoom?.disable()
  }, [mapRef, onClearPlaces, onInteractionChange])

  const fetchForCategory = useCallback(
    async (category) => {
      if (!completedFeature?.geometry?.coordinates?.[0]) return
      const ring = completedFeature.geometry.coordinates[0]
      setLoadingPlaces(true)
      setSelectedCategory(category)
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
        const q = `${category} near ${clat.toFixed(4)},${clng.toFixed(4)}`
        let apiMarkers = []
        try {
          const { data: s } = await api.get('/map/search-simple', { params: { q } })
          const raw = Array.isArray(s.results) ? s.results : []
          const closed = closeRing(ring)
          apiMarkers = raw
            .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
            .filter((r) => pointInRing(r.lng, r.lat, closed))
            .map((r, i) => ({
              placeId: r.placeId || `ext-${i}-${r.lat}`,
              displayName: r.displayName || r.name,
              lat: r.lat,
              lng: r.lng,
              markerColor: CATEGORY_MARKER[category] || '#EA4335',
              address: r.address,
              _fromDb: false,
            }))
        } catch {
          /* optional enrichment */
        }

        const seen = new Set()
        const merged = []
        for (const m of [...dbMarkers, ...apiMarkers]) {
          const k = `${Number(m.lat).toFixed(5)}-${Number(m.lng).toFixed(5)}`
          if (seen.has(k)) continue
          seen.add(k)
          merged.push(m)
        }

        setAreaPlaceCount(merged.length)
        onPlacesFound(merged, merged.length)
      } catch (err) {
        console.error(err)
        setAreaPlaceCount(0)
        onPlacesFound([], 0)
      } finally {
        setLoadingPlaces(false)
      }
    },
    [completedFeature, onPlacesFound]
  )

  if (!isOpen) return null

  return (
    <div
      className="absolute z-[28] w-[min(100vw-0.5rem,18rem)] max-h-[calc(100vh-5.5rem-env(safe-area-inset-bottom))] flex flex-col glass rounded-r-2xl border border-white/40 shadow-xl overflow-hidden"
      style={{ top: 'calc(env(safe-area-inset-top) + 3.75rem)', left: 0 }}
    >
      <div className="px-3 py-2.5 border-b border-white/40 bg-white/50">
        <h2 className="text-sm font-bold text-slate-800">Area explore</h2>
        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
          Draw a region, pick a category, then see matching places inside the shape.
        </p>
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
                clearVertexMarkers()
                if (map) setAreaFeature(map, null)
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
