import {
  circlePolygon,
  rectangleFromCorners,
  squareFromCorners,
  decimateRingMeters,
  closeRing,
  haversineMeters,
  bufferLineCorridor,
  hexagonPolygon,
  ringFromFeature,
} from './polygonGeo'

export const AREA_SHAPE_TOOLS = [
  { value: 'polygon', label: 'Polygon' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
  { value: 'freehand', label: 'Freehand' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'line', label: 'Line' },
  { value: 'polyline', label: 'Polyline' },
  { value: 'radius-circle', label: 'Radius Circle' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'custom', label: 'Custom Shape' },
  { value: 'bounding-box', label: 'Bounding Box' },
]

const SHAPE_STYLE = {
  strokeColor: '#2563EB',
  strokeOpacity: 0.9,
  strokeWeight: 2,
  fillColor: '#2563EB',
  fillOpacity: 0.15,
}

export function areaShapeHint(tool) {
  switch (tool) {
    case 'polygon':
      return 'Click corners on the map, then tap Complete shape.'
    case 'custom':
      return 'Click freely to outline any shape, then tap Complete shape.'
    case 'rectangle':
      return 'Click and drag to draw a rectangle.'
    case 'bounding-box':
      return 'Click and drag to set a bounding box.'
    case 'square':
      return 'Click and drag to draw a square.'
    case 'circle':
      return 'Click center and drag outward to set radius.'
    case 'radius-circle':
      return 'Click center point, then click again to set radius.'
    case 'hexagon':
      return 'Click center and drag to size the hexagon.'
    case 'triangle':
      return 'Click 3 corners on the map (auto-completes after 3rd point).'
    case 'freehand':
      return 'Hold and draw on the map; release to close the shape.'
    case 'line':
      return 'Click start point, then end point to create a corridor along the line.'
    case 'polyline':
      return 'Click path points, then tap Complete shape to create a corridor.'
    default:
      return 'Draw a shape on the map, then extract places inside it.'
  }
}

export function needsCompleteButton(tool) {
  return tool === 'polygon' || tool === 'custom' || tool === 'polyline'
}

export function isClickMultiPointTool(tool) {
  return tool === 'polygon' || tool === 'custom' || tool === 'triangle' || tool === 'polyline' || tool === 'line' || tool === 'radius-circle'
}

function latLngPair(latLng) {
  return [latLng.lng(), latLng.lat()]
}

function ringToPath(ring) {
  return ring.map(([lng, lat]) => ({ lat, lng }))
}

export function createPolygonOverlay(map, ring) {
  return new window.google.maps.Polygon({
    paths: ringToPath(ring),
    map,
    ...SHAPE_STYLE,
    clickable: false,
  })
}

function clearPreview(state) {
  state.previewRect?.setMap(null)
  state.previewPolyline?.setMap(null)
  state.previewPolygon?.setMap(null)
  state.previewRect = null
  state.previewPolyline = null
  state.previewPolygon = null
}

function showPreviewPolygon(map, ring, state) {
  clearPreview(state)
  if (!ring || ring.length < 3) return
  state.previewPolygon = createPolygonOverlay(map, ring)
}

function showPreviewPolyline(map, coords, state) {
  state.previewPolyline?.setMap(null)
  if (!coords || coords.length < 2) return
  state.previewPolyline = new window.google.maps.Polyline({
    path: ringToPath(coords),
    map,
    strokeColor: SHAPE_STYLE.strokeColor,
    strokeOpacity: SHAPE_STYLE.strokeOpacity,
    strokeWeight: SHAPE_STYLE.strokeWeight,
    clickable: false,
  })
}

function showPreviewRect(map, start, end, state) {
  state.previewRect?.setMap(null)
  state.previewRect = new window.google.maps.Rectangle({
    map,
    bounds: new window.google.maps.LatLngBounds(start, end),
    ...SHAPE_STYLE,
    clickable: false,
  })
}

function ringFromDragTool(tool, start, end) {
  const a = latLngPair(start)
  const b = latLngPair(end)
  const distM = Math.max(8, haversineMeters(a, b))

  if (tool === 'square') return ringFromFeature(squareFromCorners(a, b))
  if (tool === 'circle') return ringFromFeature(circlePolygon(a[0], a[1], distM))
  if (tool === 'hexagon') return ringFromFeature(hexagonPolygon(a[0], a[1], distM))
  return ringFromFeature(rectangleFromCorners(a, b))
}

function normalizeTool(tool) {
  if (tool === 'bounding-box') return 'rectangle'
  if (tool === 'custom') return 'polygon'
  return tool
}

/**
 * Attach Google Maps listeners for area shape drawing.
 * @returns {() => void} cleanup
 */
export function attachAreaShapeDrawing(map, tool, { onRingReady, onVertexCount, onAwaitingSecondClick }) {
  const normalized = normalizeTool(tool)
  const listeners = []
  const state = {
    previewRect: null,
    previewPolyline: null,
    previewPolygon: null,
    start: null,
    verts: [],
    freehand: [],
    awaitingSecond: false,
    center: null,
  }

  const finish = (ring, overlay) => {
    cleanup()
    onRingReady(ring, overlay)
  }

  const cleanup = () => {
    listeners.forEach((l) => window.google.maps.event.removeListener(l))
    listeners.length = 0
    map.setOptions({ draggable: true })
  }

  const dragTools = ['rectangle', 'square', 'circle', 'hexagon']
  const effectiveDrag = dragTools.includes(normalized) || tool === 'bounding-box'

  if (normalized === 'freehand') {
    listeners.push(
      map.addListener('mousedown', (e) => {
        map.setOptions({ draggable: false })
        state.freehand = [latLngPair(e.latLng)]
      })
    )
    listeners.push(
      map.addListener('mousemove', (e) => {
        if (!state.freehand.length) return
        const pt = latLngPair(e.latLng)
        const last = state.freehand[state.freehand.length - 1]
        if (haversineMeters(last, pt) >= 3) {
          state.freehand.push(pt)
          showPreviewPolyline(map, state.freehand, state)
        }
      })
    )
    listeners.push(
      map.addListener('mouseup', () => {
        map.setOptions({ draggable: true })
        const raw = state.freehand
        state.freehand = []
        if (raw.length < 3) return
        const ring = decimateRingMeters(closeRing(raw), 4)
        const overlay = createPolygonOverlay(map, ring)
        finish(ring, overlay)
      })
    )
  } else if (effectiveDrag) {
    listeners.push(
      map.addListener('mousedown', (e) => {
        map.setOptions({ draggable: false })
        state.start = e.latLng
        if (tool === 'bounding-box' || normalized === 'rectangle') {
          showPreviewRect(map, e.latLng, e.latLng, state)
        }
      })
    )
    listeners.push(
      map.addListener('mousemove', (e) => {
        if (!state.start) return
        if (tool === 'bounding-box' || normalized === 'rectangle') {
          showPreviewRect(map, state.start, e.latLng, state)
        } else {
          const ring = ringFromDragTool(normalized, state.start, e.latLng)
          if (ring) showPreviewPolygon(map, ring, state)
        }
      })
    )
    listeners.push(
      map.addListener('mouseup', (e) => {
        map.setOptions({ draggable: true })
        const start = state.start
        state.start = null
        if (!start) return
        const ring = ringFromDragTool(normalized, start, e.latLng)
        if (!ring) return
        const overlay = state.previewPolygon || state.previewRect
        state.previewPolygon = null
        state.previewRect = null
        if (!overlay && ring) {
          finish(ring, createPolygonOverlay(map, ring))
        } else {
          finish(ring, overlay)
        }
      })
    )
  } else if (normalized === 'radius-circle') {
    listeners.push(
      map.addListener('click', (e) => {
        if (!state.center) {
          state.center = latLngPair(e.latLng)
          state.awaitingSecond = true
          onAwaitingSecondClick?.(true)
          return
        }
        const center = state.center
        const edge = latLngPair(e.latLng)
        const distM = Math.max(8, haversineMeters(center, edge))
        const ring = ringFromFeature(circlePolygon(center[0], center[1], distM))
        const overlay = createPolygonOverlay(map, ring)
        state.center = null
        state.awaitingSecond = false
        onAwaitingSecondClick?.(false)
        finish(ring, overlay)
      })
    )
  } else if (normalized === 'line') {
    listeners.push(
      map.addListener('click', (e) => {
        state.verts.push(latLngPair(e.latLng))
        onVertexCount?.(state.verts.length)
        showPreviewPolyline(map, state.verts, state)
        if (state.verts.length >= 2) {
          const ring = bufferLineCorridor(state.verts, 30)
          if (!ring) return
          const overlay = createPolygonOverlay(map, ring)
          finish(ring, overlay)
        }
      })
    )
  } else {
    // polygon, custom, polyline, triangle (3-click)
    listeners.push(
      map.addListener('click', (e) => {
        state.verts.push(latLngPair(e.latLng))
        onVertexCount?.(state.verts.length)
        if (normalized === 'triangle' && state.verts.length >= 3) {
          const ring = closeRing(state.verts.slice(0, 3))
          const overlay = createPolygonOverlay(map, ring)
          finish(ring, overlay)
          return
        }
        if (state.verts.length >= 2) {
          showPreviewPolyline(map, state.verts, state)
        }
      })
    )
  }

  const wrappedCleanup = () => {
    cleanup()
    clearPreview(state)
  }

  wrappedCleanup.completePolylineOrPolygon = () => {
    if (normalized === 'polyline') {
      if (state.verts.length < 2) return false
      const ring = bufferLineCorridor(state.verts, 30)
      if (!ring) return false
      const overlay = createPolygonOverlay(map, ring)
      finish(ring, overlay)
      return true
    }
    if (normalized === 'polygon' || tool === 'custom') {
      if (state.verts.length < 3) return false
      const ring = closeRing(state.verts)
      const overlay = createPolygonOverlay(map, ring)
      finish(ring, overlay)
      return true
    }
    return false
  }

  wrappedCleanup.getVerts = () => state.verts

  return wrappedCleanup
}
