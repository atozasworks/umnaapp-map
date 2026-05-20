/**
 * Run fn when the map style is loaded. Retries on style.load after raster setTiles or similar,
 * which otherwise throws "Style is not done loading" if addLayer runs in the same tick.
 * @returns {() => void} dispose — call on unmount to cancel pending style.load callbacks
 */
export function whenStyleReady(map, fn) {
  if (!map || typeof map.isStyleLoaded !== 'function') return () => {}
  let disposed = false
  const run = () => {
    if (disposed) return
    if (!map.isStyleLoaded()) {
      map.once('style.load', run)
      return
    }
    try {
      fn()
    } catch (err) {
      if (disposed) return
      const msg = String(err?.message || err)
      if (msg.includes('not done loading') || msg.includes('Style is not done')) {
        map.once('style.load', run)
        return
      }
      console.error(err)
    }
  }
  run()
  return () => {
    disposed = true
    map.off('style.load', run)
  }
}
