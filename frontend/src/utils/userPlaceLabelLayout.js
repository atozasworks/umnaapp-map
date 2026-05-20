/**
 * Google Maps–style screen-space label layout for saved-place markers:
 * zoom gating, priority, collision, grid declutter, and multi-side placement.
 */

export const LABEL_COLLISION_PAD = 10
export const LABEL_DOT_PAD = 8
export const LABEL_GRID_CELL_W = 76
export const LABEL_GRID_CELL_H = 38
export const LABEL_PLACEMENTS = ['top', 'right', 'bottom', 'left']

const inflateScreenRect = (r, pad) => ({
  left: r.left - pad,
  top: r.top - pad,
  right: r.right + pad,
  bottom: r.bottom + pad,
})

export const screenRectsOverlap = (a, b) =>
  !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)

/**
 * Label cap for saved user places on the map.
 * Below z14: progressive density; z14+: every place in view gets a name (collision layout only hides overlaps).
 */
export function resolveUserPlaceLabelCap(zoom, visibleInView = 0) {
  const z = Number(zoom)
  const n = Math.max(0, Number(visibleInView) || 0)
  if (!Number.isFinite(z) || z < 10) return 0
  if (z < 11) return Math.min(12, n)
  if (z < 12) return Math.min(24, n)
  if (z < 13) return Math.min(40, n)
  if (z < 14) return Math.min(64, n)
  return n
}

/** @deprecated Use resolveUserPlaceLabelCap for saved-place markers. */
export function maxVisibleLabelsForZoom(zoom, visibleCount = 0) {
  return resolveUserPlaceLabelCap(zoom, visibleCount)
}

/** @deprecated Use resolveUserPlaceLabelCap — stored per-place caps are ignored on the main map. */
export function resolveLabelCap(zoom, visibleCount, configMaxLabels) {
  void configMaxLabels
  return resolveUserPlaceLabelCap(zoom, visibleCount)
}

function gridKeysForRect(rect, pad) {
  const inflated = inflateScreenRect(rect, pad)
  const keys = []
  const x0 = Math.floor(inflated.left / LABEL_GRID_CELL_W)
  const x1 = Math.floor(inflated.right / LABEL_GRID_CELL_W)
  const y0 = Math.floor(inflated.top / LABEL_GRID_CELL_H)
  const y1 = Math.floor(inflated.bottom / LABEL_GRID_CELL_H)
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      keys.push(`${x},${y}`)
    }
  }
  return keys
}

function gridConflicts(occupied, keys) {
  for (let i = 0; i < keys.length; i++) {
    if (occupied.has(keys[i])) return true
  }
  return false
}

function markGrid(occupied, keys) {
  for (let i = 0; i < keys.length; i++) occupied.add(keys[i])
}

/** UI overlays (search bar, nav, panels) — labels must not draw on these. */
export function collectMapLabelReservedRects(pad = 12) {
  const rects = []
  if (typeof document === 'undefined') return rects
  document.querySelectorAll('[data-map-ui-chrome]').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width > 2 && r.height > 2) {
      rects.push(inflateScreenRect(r, pad))
    }
  })
  return rects
}

/** Visible map area below header/search; labels must stay inside. */
export function computeLabelSafeBounds(mapContainerEl, reservedRects = []) {
  const mapRect = mapContainerEl?.getBoundingClientRect?.()
  if (!mapRect) return null

  let top = mapRect.top + 4
  for (let i = 0; i < reservedRects.length; i++) {
    const r = reservedRects[i]
    if (r.bottom > top && r.top < mapRect.bottom + 40) {
      top = Math.max(top, r.bottom)
    }
  }

  return {
    left: mapRect.left + 4,
    right: mapRect.right - 4,
    top,
    bottom: mapRect.bottom - 8,
  }
}

function labelFitsSafeArea(labelRect, safeBounds) {
  if (!safeBounds) return true
  return (
    labelRect.top >= safeBounds.top &&
    labelRect.left >= safeBounds.left &&
    labelRect.right <= safeBounds.right &&
    labelRect.bottom <= safeBounds.bottom
  )
}

function labelOverlapsReserved(labelRect, reservedRects) {
  if (!reservedRects?.length) return false
  const labelInflated = inflateScreenRect(labelRect, LABEL_COLLISION_PAD)
  for (let i = 0; i < reservedRects.length; i++) {
    if (screenRectsOverlap(labelInflated, reservedRects[i])) return true
  }
  return false
}

/** Prefer label below the pin when the pin sits under top UI chrome. */
export function placementsForDot(dotRect, safeBounds) {
  const nearTop =
    safeBounds && dotRect.top < safeBounds.top + 100
  if (nearTop) return ['bottom', 'right', 'left', 'top']
  return ['top', 'right', 'bottom', 'left']
}

function fitsLayoutWithCells(
  keptRects,
  occupiedGrid,
  labelRect,
  dotRect,
  reservedRects = [],
  safeBounds = null,
  collisionPad = LABEL_COLLISION_PAD,
  cellW = LABEL_GRID_CELL_W,
  cellH = LABEL_GRID_CELL_H
) {
  if (!labelFitsSafeArea(labelRect, safeBounds)) return false
  if (labelOverlapsReserved(labelRect, reservedRects)) return false

  const labelInflated = inflateScreenRect(labelRect, collisionPad)
  const dotInflated = inflateScreenRect(dotRect, LABEL_DOT_PAD)
  const labelKeys = gridKeysForRectWithCells(labelRect, collisionPad, cellW, cellH)

  if (gridConflicts(occupiedGrid, labelKeys)) return false
  for (let i = 0; i < keptRects.length; i++) {
    if (screenRectsOverlap(labelInflated, keptRects[i])) return false
    if (screenRectsOverlap(dotInflated, keptRects[i])) return false
  }
  return true
}

export function getMarkerAnchorEl(wrapper) {
  if (!wrapper) return null
  return wrapper.querySelector('.user-place-marker-anchor')
}

/** Apply label position around the geo anchor (MapLibre marker anchor = bottom). */
export function applyLabelPlacement(wrapper, placement) {
  if (!wrapper) return
  const label = wrapper.querySelector('.user-place-marker-label')
  const anchor = getMarkerAnchorEl(wrapper)
  if (!label || !anchor) return

  wrapper.dataset.labelPlacement = placement
  wrapper.style.display = 'flex'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'flex-end'
  wrapper.style.textAlign = 'center'
  label.style.margin = '0'
  anchor.style.margin = '0'
  label.style.maxWidth = placement === 'top' || placement === 'bottom' ? '200px' : '140px'
  label.style.whiteSpace = placement === 'top' || placement === 'bottom' ? 'normal' : 'nowrap'
  label.style.overflow = placement === 'top' || placement === 'bottom' ? 'visible' : 'hidden'
  label.style.textOverflow = placement === 'top' || placement === 'bottom' ? 'clip' : 'ellipsis'

  switch (placement) {
    case 'bottom':
      wrapper.style.flexDirection = 'column-reverse'
      label.style.marginTop = '2px'
      break
    case 'right':
      wrapper.style.flexDirection = 'row'
      label.style.marginLeft = '4px'
      label.style.textAlign = 'left'
      break
    case 'left':
      wrapper.style.flexDirection = 'row-reverse'
      label.style.marginRight = '4px'
      label.style.textAlign = 'right'
      break
    case 'top':
    default:
      wrapper.style.flexDirection = 'column'
      label.style.marginBottom = '2px'
      break
  }
}

/** Show label for measurement (invisible) or hide entirely. */
export function setMarkerLabelMeasureMode(marker, measuring) {
  const el = marker?.getElement?.()
  if (!el) return
  const label = el.querySelector('.user-place-marker-label')
  const anchor = getMarkerAnchorEl(el)
  if (!label) return
  if (measuring) {
    label.style.display = 'block'
    label.style.visibility = 'hidden'
    label.style.pointerEvents = 'none'
    if (anchor) anchor.style.display = 'block'
  } else {
    label.style.visibility = ''
    label.style.pointerEvents = ''
  }
}

/** Labels-only markers (Google Maps style): text on map, no pin dots. */
export function applyMarkerLabelState(marker, { labelOn, placement = 'top' }) {
  const el = marker?.getElement?.()
  if (!el) return
  const label = el.querySelector('.user-place-marker-label')
  const anchor = getMarkerAnchorEl(el)

  if (labelOn && label) {
    applyLabelPlacement(el, placement)
    label.style.display = 'block'
    label.style.visibility = 'visible'
    label.style.opacity = '1'
    el.style.pointerEvents = 'auto'
    if (anchor) anchor.style.display = 'block'
  } else if (label) {
    applyLabelPlacement(el, 'top')
    label.style.display = 'none'
    label.style.visibility = ''
    label.style.opacity = ''
    el.style.pointerEvents = 'none'
    if (anchor) anchor.style.display = 'none'
  }
}

/**
 * Pick which markers show text labels; losers stay hidden (no fallback dots).
 * @param {Array<{ key: string, marker: object, priority: number, place?: object }>} entries
 * @param {{ zoom: number, maxLabels: number }} options
 * @returns {Map<string, { placement: string }>}
 */
function gridKeysForRectWithCells(rect, pad, cellW, cellH) {
  const inflated = inflateScreenRect(rect, pad)
  const keys = []
  const x0 = Math.floor(inflated.left / cellW)
  const x1 = Math.floor(inflated.right / cellW)
  const y0 = Math.floor(inflated.top / cellH)
  const y1 = Math.floor(inflated.bottom / cellH)
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      keys.push(`${x},${y}`)
    }
  }
  return keys
}

export function layoutUserPlaceLabels(
  entries,
  { zoom, maxLabels, reservedRects = [], safeBounds = null }
) {
  const winners = new Map()
  if (!entries?.length || maxLabels <= 0) return winners

  const z = Number(zoom)
  const dense = Number.isFinite(z) && z >= 14
  const cellW = dense ? 52 : LABEL_GRID_CELL_W
  const cellH = dense ? 28 : LABEL_GRID_CELL_H
  const collisionPad = dense ? 6 : LABEL_COLLISION_PAD

  const sorted = [...entries].sort((a, b) => {
    const d = b.priority - a.priority
    if (d !== 0) return d
    const ida = String(a.place?.id ?? a.key)
    const idb = String(b.place?.id ?? b.key)
    return ida.localeCompare(idb)
  })

  const keptRects = []
  const occupiedGrid = new Set()

  for (const row of sorted) {
    if (winners.size >= maxLabels) break
    const el = row.marker?.getElement?.()
    if (!el) continue
    const label = el.querySelector('.user-place-marker-label')
    const anchor = getMarkerAnchorEl(el)
    if (!label || !anchor) continue

    const anchorRect0 = anchor.getBoundingClientRect()
    const tryPlacements = placementsForDot(anchorRect0, safeBounds)

    let chosen = null
    for (let p = 0; p < tryPlacements.length; p++) {
      const placement = tryPlacements[p]
      applyLabelPlacement(el, placement)
      const labelRect = label.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      if (!labelRect?.width || labelRect.width < 2 || !labelRect?.height || labelRect.height < 2) {
        continue
      }
      if (
        fitsLayoutWithCells(
          keptRects,
          occupiedGrid,
          labelRect,
          anchorRect,
          reservedRects,
          safeBounds,
          collisionPad,
          cellW,
          cellH
        )
      ) {
        chosen = { placement, labelRect, anchorRect }
        break
      }
    }

    if (!chosen) continue

    keptRects.push(inflateScreenRect(chosen.labelRect, collisionPad))
    markGrid(occupiedGrid, gridKeysForRectWithCells(chosen.labelRect, collisionPad, cellW, cellH))
    winners.set(row.key, { placement: chosen.placement })
  }

  return winners
}

/** Throttle for map move/zoom handlers. */
export function throttle(fn, ms) {
  let last = 0
  let timer = null
  return (...args) => {
    const now = Date.now()
    const remaining = ms - (now - last)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn(...args)
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null
        last = Date.now()
        fn(...args)
      }, remaining)
    }
  }
}
