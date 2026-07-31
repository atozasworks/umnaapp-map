/**
 * HiDPI / retina helpers for MapLibre raster basemaps.
 * Uses @2x PNG tiles (512px) with tileSize 256 — same pattern as Mapbox/CARTO.
 * Offline packs stay on 1x `/api/map/tiles/...` URLs (do not retina those when offline).
 */

export const wantsRetinaTiles = () => {
  if (typeof window === 'undefined') return false
  return (window.devicePixelRatio || 1) >= 1.5
}

/** True when template already requests @2x tiles. */
export const isRetinaTileUrl = (template) => /@2x\.png/i.test(String(template || ''))

/** Strip @2x so offline / 1x fallbacks match cached pack URLs. */
export const toStandardTileUrl = (template) => {
  if (!template) return template
  return String(template).replace(/@2x\.png/gi, '.png')
}

/**
 * Upgrade known raster hosts to @2x on HiDPI screens.
 * Esri / OpenTopoMap have no reliable @2x — left unchanged.
 */
export const toRetinaTileUrl = (template) => {
  if (!template || !wantsRetinaTiles() || isRetinaTileUrl(template)) return template
  const url = String(template)
  const canRetina =
    url.includes('basemaps.cartocdn.com') ||
    url.includes('umnaapp.in') ||
    url.includes('/tiles/{z}/{x}/{y}') ||
    url.startsWith('/api/map/tiles') ||
    url.includes('/map-tiles/')
  if (!canRetina) return template
  return url.replace(/\.png(\?.*)?$/i, '@2x.png$1')
}

export const mapUrlsToRetina = (urls) => (urls || []).map((u) => toRetinaTileUrl(u))

/** Linear + no fade — smooth zoom; sharpness comes from @2x tiles on HiDPI. */
export const RASTER_TILE_PAINT = {
  'raster-resampling': 'linear',
  'raster-fade-duration': 0,
  'raster-opacity': 1,
}
