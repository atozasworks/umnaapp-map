/**
 * HiDPI / retina helpers for MapLibre raster basemaps.
 * Uses @2x PNG tiles (512px) with tileSize 256 — same pattern as Mapbox/CARTO.
 * Offline packs stay on 1x `/api/map/tiles/...` URLs (do not retina those when offline).
 */

/** Raster CARTO tiles require ?key= or they render an "API key required" watermark. */
export const CARTO_API_KEY = String(
  import.meta.env.VITE_CARTO_API_KEY || 'cb1_2ibu_1_f81be7b5227dc1beb016c42f'
).trim()

export const withCartoApiKey = (template) => {
  if (!template || !CARTO_API_KEY) return template
  const url = String(template)
  if (!url.includes('basemaps.cartocdn.com') || /[?&]key=/.test(url)) return template
  return `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(CARTO_API_KEY)}`
}

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
 * Upgrade to @2x only on hosts that actually serve real 512px retina tiles.
 *
 * ONLY CARTO is retina-capable here. The self-hosted umnaapp.in tile server (and
 * its /api/map proxy / dev /map-tiles route) return HTTP 404 for `@2x.png`, so
 * requesting @2x from it made every viewport tile fail on HiDPI screens. That
 * triggered the fallback path (setTiles → full tile-cache reload), which
 * cancelled in-flight requests and left blank tiles during zoom/pan. Keeping
 * umnaapp.in on 1x avoids the 404 storm entirely.
 *
 * Esri / OpenTopoMap have no reliable @2x either — left unchanged.
 * CARTO URLs always get ?key= so watermarked tiles are never requested.
 */
export const toRetinaTileUrl = (template) => {
  if (!template) return template
  if (!wantsRetinaTiles() || isRetinaTileUrl(template)) return withCartoApiKey(template)
  const url = String(template)
  const canRetina = url.includes('basemaps.cartocdn.com')
  if (!canRetina) return withCartoApiKey(template)
  return withCartoApiKey(url.replace(/\.png(\?.*)?$/i, '@2x.png$1'))
}

export const mapUrlsToRetina = (urls) => (urls || []).map((u) => toRetinaTileUrl(u))

/**
 * Linear resampling for smooth scaling; a short raster fade keeps the previous
 * (parent) tiles on screen and cross-fades new ones in — the Google Maps
 * behaviour that prevents blank/beige gaps while zooming and panning. A zero
 * fade makes MapLibre drop parent tiles immediately, exposing the background
 * layer until the target-zoom tiles finish loading.
 */
export const RASTER_TILE_PAINT = {
  'raster-resampling': 'linear',
  // Keep parent tiles on screen while the next zoom's PNGs arrive.
  'raster-fade-duration': 400,
  'raster-opacity': 1,
}
