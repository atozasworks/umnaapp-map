import { whenStyleReady } from './mapWhenStyleReady'

export const AREA_SOURCE = 'area-explore-draw-src'
export const AREA_FILL = 'area-explore-draw-fill'
export const AREA_LINE_OUTLINE = 'area-explore-draw-line-outline'
export const AREA_LINE = 'area-explore-draw-line'

export const AREA_LAYER_STACK = [AREA_FILL, AREA_LINE_OUTLINE, AREA_LINE]

export function bringAreaExploreLayersToTop(map) {
  if (!map?.getStyle?.()) return
  try {
    for (const id of AREA_LAYER_STACK) {
      if (map.getLayer(id)) map.moveLayer(id)
    }
  } catch {
    /* basemap / route layers may not exist yet */
  }
}

export function ensureAreaExploreLayers(map) {
  if (!map?.isStyleLoaded?.()) return false

  if (!map.getSource(AREA_SOURCE)) {
    map.addSource(AREA_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getLayer(AREA_FILL)) {
    map.addLayer({
      id: AREA_FILL,
      type: 'fill',
      source: AREA_SOURCE,
      paint: {
        'fill-color': '#4F46E5',
        'fill-opacity': 0.28,
      },
    })
  }

  if (!map.getLayer(AREA_LINE_OUTLINE)) {
    map.addLayer({
      id: AREA_LINE_OUTLINE,
      type: 'line',
      source: AREA_SOURCE,
      paint: {
        'line-color': '#ffffff',
        'line-width': 5,
        'line-opacity': 0.95,
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
    })
  }

  if (!map.getLayer(AREA_LINE)) {
    map.addLayer({
      id: AREA_LINE,
      type: 'line',
      source: AREA_SOURCE,
      paint: {
        'line-color': '#4338CA',
        'line-width': 3,
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
    })
  }

  bringAreaExploreLayersToTop(map)
  return true
}

export function applyAreaExploreFeature(map, feature) {
  if (!map) return
  const run = () => {
    if (!ensureAreaExploreLayers(map)) return
    const src = map.getSource(AREA_SOURCE)
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: feature ? [feature] : [],
    })
    bringAreaExploreLayersToTop(map)
  }

  if (map.isStyleLoaded?.()) {
    run()
  } else {
    whenStyleReady(map, run)
  }
}

export function clearAreaExploreFeature(map) {
  applyAreaExploreFeature(map, null)
}
