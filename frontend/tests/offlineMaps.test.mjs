import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  QUALITY_PRESETS,
  lngLatToTile,
  normalizeBounds,
  clampBoundsForDownload,
  areaKeyFromBounds,
  boundsOverlapRatio,
  pointInBounds,
  enumerateTiles,
  estimateTileCount,
  estimateStorageBytes,
  formatBytes,
  tileUrl,
  MAX_BOUNDS_SPAN_DEG,
} from '../src/utils/offlineMaps.js'

describe('offlineMaps', () => {
  it('defines low/medium/high quality presets', () => {
    assert.equal(QUALITY_PRESETS.low.maxZoom, 12)
    assert.equal(QUALITY_PRESETS.medium.maxZoom, 14)
    assert.equal(QUALITY_PRESETS.high.maxZoom, 16)
  })

  it('converts lng/lat to tile coordinates', () => {
    const t = lngLatToTile(77.5946, 12.9716, 10)
    assert.equal(t.z, 10)
    assert.ok(t.x > 0 && t.y > 0)
  })

  it('normalizes and clamps oversized bounds', () => {
    const big = normalizeBounds({ west: 70, south: 10, east: 80, north: 20 })
    const clamped = clampBoundsForDownload(big)
    assert.ok(clamped.east - clamped.west <= MAX_BOUNDS_SPAN_DEG + 1e-9)
    assert.ok(clamped.north - clamped.south <= MAX_BOUNDS_SPAN_DEG + 1e-9)
  })

  it('builds stable area keys and detects overlap', () => {
    const a = { west: 77.5, south: 12.9, east: 77.7, north: 13.1 }
    const key = areaKeyFromBounds(a, 'medium')
    assert.ok(key.includes('medium'))
    assert.ok(boundsOverlapRatio(a, a) > 0.99)
    assert.equal(boundsOverlapRatio(a, { west: 80, south: 20, east: 81, north: 21 }), 0)
  })

  it('checks point-in-bounds', () => {
    const b = { west: 77, south: 12, east: 78, north: 13 }
    assert.equal(pointInBounds(77.5, 12.5, b), true)
    assert.equal(pointInBounds(79, 12.5, b), false)
  })

  it('enumerates tiles and estimates storage', () => {
    const bounds = { west: 77.59, south: 12.96, east: 77.61, north: 12.98 }
    const tiles = enumerateTiles(bounds, 10, 11)
    assert.ok(tiles.length > 0)
    assert.ok(estimateTileCount(bounds, 'low') > 0)
    assert.ok(estimateStorageBytes(bounds, 'low') > 0)
  })

  it('formats bytes and builds tile URLs', () => {
    assert.equal(formatBytes(500), '500 B')
    assert.ok(formatBytes(2048).includes('KB'))
    assert.equal(tileUrl(5, 23, 14), '/api/map/tiles/5/23/14.png')
  })
})
