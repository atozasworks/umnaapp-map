/**
 * Offline Maps — region metadata (IndexedDB) + tile blobs (Cache API).
 * Street tiles only, via same-origin proxy for reliable caching.
 */

export const OFFLINE_TILE_CACHE = 'offline-map-tiles'
export const OFFLINE_DB_NAME = 'umnaapp-offline-maps'
export const OFFLINE_DB_VERSION = 1
export const OFFLINE_STORE = 'regions'
export const OFFLINE_TILE_URL_TEMPLATE = '/api/map/tiles/{z}/{x}/{y}.png'

/** Avg PNG size used for estimates (street raster). */
const BYTES_PER_TILE_ESTIMATE = 14_000

/** Concurrent tile fetches — keep battery/network friendly. */
const DOWNLOAD_CONCURRENCY = 4

export const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({
    id: 'low',
    label: 'Low',
    minZoom: 8,
    maxZoom: 12,
    description: 'Overview & city-level',
  }),
  medium: Object.freeze({
    id: 'medium',
    label: 'Medium',
    minZoom: 8,
    maxZoom: 14,
    description: 'Neighborhood detail',
  }),
  high: Object.freeze({
    id: 'high',
    label: 'High',
    minZoom: 8,
    maxZoom: 16,
    description: 'Street-level detail',
  }),
})

const QUALITY_ORDER = ['low', 'medium', 'high']

/** Clamp map bounds to a downloadable area (avoid huge packs). */
export const MAX_BOUNDS_SPAN_DEG = 1.2

/** Hard cap — protects storage/battery on oversized viewports. */
export const MAX_TILES_PER_DOWNLOAD = 12_000

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available on this device'))
      return
    }
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)
    req.onerror = () => reject(req.error || new Error('Failed to open offline maps database'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        const store = db.createObjectStore(OFFLINE_STORE, { keyPath: 'id' })
        store.createIndex('areaKey', 'areaKey', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }
    }
  })
}

function idbReq(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function lngLatToTile(lng, lat, zoom) {
  const z = Math.floor(zoom)
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return {
    z,
    x: Math.min(n - 1, Math.max(0, x)),
    y: Math.min(n - 1, Math.max(0, y)),
  }
}

export function tileToLngLatBounds(z, x, y) {
  const n = 2 ** z
  const west = (x / n) * 360 - 180
  const east = ((x + 1) / n) * 360 - 180
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)))
  return {
    west,
    east,
    north: (northRad * 180) / Math.PI,
    south: (southRad * 180) / Math.PI,
  }
}

export function normalizeBounds(bounds) {
  const west = Number(bounds?.west ?? bounds?.sw?.[0] ?? bounds?._sw?.lng)
  const south = Number(bounds?.south ?? bounds?.sw?.[1] ?? bounds?._sw?.lat)
  const east = Number(bounds?.east ?? bounds?.ne?.[0] ?? bounds?._ne?.lng)
  const north = Number(bounds?.north ?? bounds?.ne?.[1] ?? bounds?._ne?.lat)
  if (![west, south, east, north].every(Number.isFinite)) {
    throw new Error('Invalid map bounds')
  }
  return {
    west: Math.min(west, east),
    south: Math.min(south, north),
    east: Math.max(west, east),
    north: Math.max(south, north),
  }
}

export function clampBoundsForDownload(bounds) {
  const b = normalizeBounds(bounds)
  const lngSpan = b.east - b.west
  const latSpan = b.north - b.south
  if (lngSpan <= MAX_BOUNDS_SPAN_DEG && latSpan <= MAX_BOUNDS_SPAN_DEG) return b

  const cx = (b.west + b.east) / 2
  const cy = (b.south + b.north) / 2
  const halfLng = Math.min(lngSpan, MAX_BOUNDS_SPAN_DEG) / 2
  const halfLat = Math.min(latSpan, MAX_BOUNDS_SPAN_DEG) / 2
  return {
    west: cx - halfLng,
    east: cx + halfLng,
    south: cy - halfLat,
    north: cy + halfLat,
  }
}

export function areaKeyFromBounds(bounds, qualityId) {
  const b = normalizeBounds(bounds)
  const round = (n) => Math.round(n * 1000) / 1000
  return `${round(b.west)},${round(b.south)},${round(b.east)},${round(b.north)}:${qualityId}`
}

export function boundsOverlapRatio(a, b) {
  const A = normalizeBounds(a)
  const B = normalizeBounds(b)
  const west = Math.max(A.west, B.west)
  const east = Math.min(A.east, B.east)
  const south = Math.max(A.south, B.south)
  const north = Math.min(A.north, B.north)
  if (west >= east || south >= north) return 0
  const inter = (east - west) * (north - south)
  const areaA = (A.east - A.west) * (A.north - A.south)
  if (areaA <= 0) return 0
  return inter / areaA
}

export function pointInBounds(lng, lat, bounds) {
  const b = normalizeBounds(bounds)
  return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north
}

export function enumerateTiles(bounds, minZoom, maxZoom) {
  const b = normalizeBounds(bounds)
  const tiles = []
  for (let z = minZoom; z <= maxZoom; z += 1) {
    const nw = lngLatToTile(b.west, b.north, z)
    const se = lngLatToTile(b.east, b.south, z)
    const x0 = Math.min(nw.x, se.x)
    const x1 = Math.max(nw.x, se.x)
    const y0 = Math.min(nw.y, se.y)
    const y1 = Math.max(nw.y, se.y)
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        tiles.push({ z, x, y })
      }
    }
  }
  return tiles
}

export function estimateTileCount(bounds, qualityId) {
  const preset = QUALITY_PRESETS[qualityId] || QUALITY_PRESETS.medium
  const clamped = clampBoundsForDownload(bounds)
  return enumerateTiles(clamped, preset.minZoom, preset.maxZoom).length
}

export function estimateStorageBytes(bounds, qualityId) {
  return estimateTileCount(bounds, qualityId) * BYTES_PER_TILE_ESTIMATE
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function tileUrl(z, x, y) {
  return OFFLINE_TILE_URL_TEMPLATE.replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}

export async function listRegions() {
  const db = await openDb()
  try {
    const tx = db.transaction(OFFLINE_STORE, 'readonly')
    const rows = await idbReq(tx.objectStore(OFFLINE_STORE).getAll())
    return (rows || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  } finally {
    db.close()
  }
}

export async function getRegion(id) {
  const db = await openDb()
  try {
    const tx = db.transaction(OFFLINE_STORE, 'readonly')
    return idbReq(tx.objectStore(OFFLINE_STORE).get(id))
  } finally {
    db.close()
  }
}

export async function saveRegion(region) {
  const db = await openDb()
  try {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite')
    await idbReq(tx.objectStore(OFFLINE_STORE).put(region))
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return region
  } finally {
    db.close()
  }
}

export async function deleteRegionRecord(id) {
  const db = await openDb()
  try {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite')
    await idbReq(tx.objectStore(OFFLINE_STORE).delete(id))
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function hasCompletedOfflineRegions() {
  const regions = await listRegions()
  return regions.some((r) => r.status === 'ready')
}

export async function findCoveringRegion(lng, lat, zoom = 12) {
  const regions = await listRegions()
  const ready = regions.filter((r) => r.status === 'ready')
  for (const region of ready) {
    if (!pointInBounds(lng, lat, region.bounds)) continue
    const maxZ = QUALITY_PRESETS[region.quality]?.maxZoom ?? 14
    if (zoom <= maxZ + 1) return region
  }
  return null
}

export async function isViewportCovered(bounds, zoom) {
  const b = normalizeBounds(bounds)
  const cx = (b.west + b.east) / 2
  const cy = (b.south + b.north) / 2
  return Boolean(await findCoveringRegion(cx, cy, zoom))
}

export async function findDuplicateRegion(bounds, qualityId) {
  const key = areaKeyFromBounds(clampBoundsForDownload(bounds), qualityId)
  const regions = await listRegions()
  const exact = regions.find(
    (r) => r.areaKey === key && (r.status === 'ready' || r.status === 'downloading' || r.status === 'paused')
  )
  if (exact) return { type: 'exact', region: exact }

  const qualityRank = QUALITY_ORDER.indexOf(qualityId)
  for (const region of regions) {
    if (region.status !== 'ready' && region.status !== 'downloading' && region.status !== 'paused') continue
    const overlap = boundsOverlapRatio(clampBoundsForDownload(bounds), region.bounds)
    const existingRank = QUALITY_ORDER.indexOf(region.quality)
    if (overlap >= 0.85 && existingRank >= qualityRank) {
      return { type: 'overlap', region }
    }
  }
  return null
}

export async function getStorageEstimate() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0, available: Infinity }
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota, available: Math.max(0, quota - usage) }
  } catch {
    return { usage: 0, quota: 0, available: Infinity }
  }
}

export async function sumOfflineStorageBytes() {
  const regions = await listRegions()
  return regions.reduce((sum, r) => sum + (Number(r.bytesUsed) || 0), 0)
}

async function openTileCache() {
  if (typeof caches === 'undefined') {
    throw new Error('Cache Storage is not available in this browser')
  }
  return caches.open(OFFLINE_TILE_CACHE)
}

export async function deleteRegionTiles(region) {
  if (!region?.tiles?.length) return
  const cache = await openTileCache()
  await Promise.all(
    region.tiles.map((t) => cache.delete(tileUrl(t.z, t.x, t.y)).catch(() => false))
  )
}

export async function deleteOfflineRegion(id) {
  const region = await getRegion(id)
  if (region) {
    try {
      await deleteRegionTiles(region)
    } catch {
      /* best-effort tile cleanup */
    }
  }
  await deleteRegionRecord(id)
  return region
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function defaultRegionName(bounds) {
  const b = normalizeBounds(bounds)
  const lat = ((b.south + b.north) / 2).toFixed(2)
  const lng = ((b.west + b.east) / 2).toFixed(2)
  return `Map ${lat}°, ${lng}°`
}

/**
 * Active download controller (singleton). Supports pause / resume / cancel.
 */
class OfflineDownloadManager {
  constructor() {
    this._active = null
    this._listeners = new Set()
  }

  subscribe(fn) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  _emit(snapshot) {
    for (const fn of this._listeners) {
      try {
        fn(snapshot)
      } catch {
        /* ignore listener errors */
      }
    }
  }

  getActive() {
    return this._active
  }

  async start({ bounds, qualityId = 'medium', name, regionId = null, onProgress } = {}) {
    if (this._active && (this._active.status === 'downloading' || this._active.status === 'paused')) {
      throw new Error('Another download is already in progress')
    }

    const preset = QUALITY_PRESETS[qualityId]
    if (!preset) throw new Error('Invalid download quality')

    const clamped = clampBoundsForDownload(bounds)
    const dup = await findDuplicateRegion(clamped, qualityId)
    if (dup && !regionId) {
      if (dup.type === 'exact' || dup.type === 'overlap') {
        const err = new Error(
          dup.type === 'exact'
            ? 'This area is already downloaded'
            : `This area overlaps “${dup.region.name}” which already covers it`
        )
        err.code = 'DUPLICATE'
        err.region = dup.region
        throw err
      }
    }
    if (dup?.type === 'exact' && regionId && dup.region.id !== regionId && dup.region.status === 'ready') {
      const err = new Error('This area is already downloaded')
      err.code = 'DUPLICATE'
      err.region = dup.region
      throw err
    }

    const tiles = enumerateTiles(clamped, preset.minZoom, preset.maxZoom)
    if (tiles.length > MAX_TILES_PER_DOWNLOAD) {
      const err = new Error(
        `This area is too large for ${preset.label} quality (${tiles.length.toLocaleString()} tiles). Zoom in or choose a lower quality.`
      )
      err.code = 'TOO_LARGE'
      throw err
    }
    const estimatedBytes = tiles.length * BYTES_PER_TILE_ESTIMATE
    const storage = await getStorageEstimate()
    if (Number.isFinite(storage.available) && storage.available < estimatedBytes * 1.15) {
      const err = new Error(
        `Not enough storage. Need about ${formatBytes(estimatedBytes)}, available ${formatBytes(storage.available)}.`
      )
      err.code = 'QUOTA'
      throw err
    }

    let region = regionId ? await getRegion(regionId) : null
    const now = Date.now()
    if (!region) {
      region = {
        id: createId(),
        name: (name && String(name).trim()) || defaultRegionName(clamped),
        bounds: clamped,
        quality: qualityId,
        areaKey: areaKeyFromBounds(clamped, qualityId),
        minZoom: preset.minZoom,
        maxZoom: preset.maxZoom,
        tiles,
        totalTiles: tiles.length,
        completedTiles: 0,
        bytesUsed: 0,
        status: 'downloading',
        createdAt: now,
        updatedAt: now,
        error: null,
      }
    } else {
      region = {
        ...region,
        tiles,
        totalTiles: tiles.length,
        completedTiles: 0,
        bytesUsed: 0,
        quality: qualityId,
        minZoom: preset.minZoom,
        maxZoom: preset.maxZoom,
        bounds: clamped,
        areaKey: areaKeyFromBounds(clamped, qualityId),
        status: 'downloading',
        updatedAt: now,
        error: null,
      }
    }

    await saveRegion(region)

    const controller = {
      regionId: region.id,
      status: 'downloading',
      completed: 0,
      total: tiles.length,
      bytesUsed: 0,
      pauseRequested: false,
      cancelRequested: false,
      _resumeWaiters: [],
    }
    this._active = controller

    const notify = () => {
      const snap = {
        regionId: controller.regionId,
        status: controller.status,
        completed: controller.completed,
        total: controller.total,
        bytesUsed: controller.bytesUsed,
        progress: controller.total ? controller.completed / controller.total : 0,
      }
      onProgress?.(snap)
      this._emit(snap)
    }
    notify()

    // Prefer Background Fetch when available (Android Chrome / PWA).
    this._tryBackgroundFetch(region, tiles).catch(() => {})

    try {
      await this._runDownload(region, tiles, controller, notify)
    } catch (err) {
      if (controller.cancelRequested) {
        await deleteOfflineRegion(region.id).catch(() => {})
        controller.status = 'cancelled'
        notify()
        this._active = null
        return null
      }
      region.status = 'error'
      region.error = err?.message || 'Download failed'
      region.completedTiles = controller.completed
      region.bytesUsed = controller.bytesUsed
      region.updatedAt = Date.now()
      await saveRegion(region)
      controller.status = 'error'
      notify()
      this._active = null
      throw err
    }

    if (controller.cancelRequested) {
      await deleteOfflineRegion(region.id).catch(() => {})
      controller.status = 'cancelled'
      notify()
      this._active = null
      return null
    }

    region.status = 'ready'
    region.completedTiles = controller.completed
    region.bytesUsed = controller.bytesUsed
    region.updatedAt = Date.now()
    region.error = null
    await saveRegion(region)
    controller.status = 'ready'
    notify()
    this._active = null
    return region
  }

  pause() {
    if (!this._active || this._active.status !== 'downloading') return
    this._active.pauseRequested = true
    this._active.status = 'paused'
    this._emit({
      regionId: this._active.regionId,
      status: 'paused',
      completed: this._active.completed,
      total: this._active.total,
      bytesUsed: this._active.bytesUsed,
      progress: this._active.total ? this._active.completed / this._active.total : 0,
    })
  }

  resume() {
    if (!this._active || this._active.status !== 'paused') return
    this._active.pauseRequested = false
    this._active.status = 'downloading'
    const waiters = this._active._resumeWaiters.splice(0)
    waiters.forEach((resolve) => resolve())
    this._emit({
      regionId: this._active.regionId,
      status: 'downloading',
      completed: this._active.completed,
      total: this._active.total,
      bytesUsed: this._active.bytesUsed,
      progress: this._active.total ? this._active.completed / this._active.total : 0,
    })
  }

  cancel() {
    if (!this._active) return
    this._active.cancelRequested = true
    this._active.pauseRequested = false
    const waiters = this._active._resumeWaiters.splice(0)
    waiters.forEach((resolve) => resolve())
  }

  async _waitIfPaused(controller) {
    while (controller.pauseRequested && !controller.cancelRequested) {
      controller.status = 'paused'
      const region = await getRegion(controller.regionId)
      if (region) {
        region.status = 'paused'
        region.completedTiles = controller.completed
        region.bytesUsed = controller.bytesUsed
        region.updatedAt = Date.now()
        await saveRegion(region)
      }
      await new Promise((resolve) => {
        controller._resumeWaiters.push(resolve)
      })
    }
  }

  async _runDownload(region, tiles, controller, notify) {
    const cache = await openTileCache()
    let index = 0

    const worker = async () => {
      while (index < tiles.length) {
        if (controller.cancelRequested) return
        await this._waitIfPaused(controller)
        if (controller.cancelRequested) return

        const i = index
        index += 1
        const t = tiles[i]
        const url = tileUrl(t.z, t.x, t.y)

        const existing = await cache.match(url)
        if (existing) {
          const buf = await existing.arrayBuffer()
          controller.completed += 1
          controller.bytesUsed += buf.byteLength
          if (controller.completed % 8 === 0 || controller.completed === controller.total) {
            region.completedTiles = controller.completed
            region.bytesUsed = controller.bytesUsed
            region.status = 'downloading'
            region.updatedAt = Date.now()
            await saveRegion(region)
            notify()
          } else {
            notify()
          }
          continue
        }

        const res = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' })
        if (!res.ok) {
          throw new Error(`Tile download failed (${res.status}) at z${t.z}/${t.x}/${t.y}`)
        }
        const buf = await res.arrayBuffer()
        if (buf.byteLength < 8) {
          throw new Error(`Invalid tile data at z${t.z}/${t.x}/${t.y}`)
        }
        const u8 = new Uint8Array(buf)
        const isPng = u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47
        if (!isPng) {
          throw new Error(`Non-PNG tile at z${t.z}/${t.x}/${t.y}`)
        }

        await cache.put(url, new Response(buf, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'max-age=31536000',
          },
        }))

        controller.completed += 1
        controller.bytesUsed += buf.byteLength

        if (controller.completed % 8 === 0 || controller.completed === controller.total) {
          region.completedTiles = controller.completed
          region.bytesUsed = controller.bytesUsed
          region.status = 'downloading'
          region.updatedAt = Date.now()
          await saveRegion(region)
        }
        notify()
      }
    }

    const workers = Array.from(
      { length: Math.min(DOWNLOAD_CONCURRENCY, tiles.length) },
      () => worker()
    )
    await Promise.all(workers)
  }

  async _tryBackgroundFetch(region, tiles) {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready.catch(() => null)
    if (!reg?.active) return

    // Ask SW to keep the download alive via waitUntil when tab backgrounds.
    reg.active.postMessage({
      type: 'OFFLINE_MAP_DOWNLOAD_META',
      regionId: region.id,
      tileCount: tiles.length,
    })

    if (!('backgroundFetch' in reg)) return
    try {
      const urls = tiles.slice(0, 200).map((t) => tileUrl(t.z, t.x, t.y))
      if (!urls.length) return
      const existing = await reg.backgroundFetch.get(`offline-map-${region.id}`).catch(() => null)
      if (existing) return
      await reg.backgroundFetch.fetch(`offline-map-${region.id}`, urls, {
        title: `Offline map: ${region.name}`,
        downloadTotal: urls.length * BYTES_PER_TILE_ESTIMATE,
      })
    } catch {
      /* Background Fetch unsupported or denied — foreground download continues */
    }
  }
}

export const offlineDownloadManager = new OfflineDownloadManager()

export async function renameOfflineRegion(id, name) {
  const region = await getRegion(id)
  if (!region) throw new Error('Map not found')
  const next = String(name || '').trim()
  if (!next) throw new Error('Name cannot be empty')
  region.name = next
  region.updatedAt = Date.now()
  await saveRegion(region)
  return region
}

export async function updateOfflineRegion(id, { bounds, qualityId } = {}) {
  const region = await getRegion(id)
  if (!region) throw new Error('Map not found')
  return offlineDownloadManager.start({
    bounds: bounds || region.bounds,
    qualityId: qualityId || region.quality,
    name: region.name,
    regionId: id,
  })
}

/** Persist a flag so PWA banner / map can know packs exist without async IDB on every paint. */
export function setOfflinePacksFlag(hasPacks) {
  try {
    localStorage.setItem('umnaapp_offline_packs', hasPacks ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function getOfflinePacksFlag() {
  try {
    return localStorage.getItem('umnaapp_offline_packs') === '1'
  } catch {
    return false
  }
}

export async function refreshOfflinePacksFlag() {
  const has = await hasCompletedOfflineRegions()
  setOfflinePacksFlag(has)
  return has
}
