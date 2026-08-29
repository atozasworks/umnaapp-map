import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PUBLIC_UTILITY_TYPES,
  UTILITY_RADIUS_OPTIONS,
  UTILITY_DEFAULT_RADIUS_METERS,
  buildGoogleMapsNavUrl,
  toUtilityOverlayPlace,
  getUtilityTypeMeta,
} from '../src/utils/publicUtilities.js'

describe('publicUtilities', () => {
  it('defines required utility categories', () => {
    const ids = PUBLIC_UTILITY_TYPES.map((t) => t.id)
    for (const id of [
      'toilets',
      'drinking_water',
      'charging',
      'wifi',
      'parking',
      'bus_stop',
      'police',
      'fire_station',
      'hospital',
      'atm',
    ]) {
      assert.ok(ids.includes(id), `missing ${id}`)
    }
  })

  it('exposes radius options 1/2/5/10 km', () => {
    assert.deepEqual(
      UTILITY_RADIUS_OPTIONS.map((r) => r.meters),
      [1000, 2000, 5000, 10000]
    )
    assert.equal(UTILITY_DEFAULT_RADIUS_METERS, 2000)
  })

  it('builds Google Maps navigation URL', () => {
    const url = buildGoogleMapsNavUrl(12.97, 77.59)
    assert.match(url, /google\.com\/maps\/dir/)
    assert.match(url, /12\.97/)
    assert.match(url, /77\.59/)
  })

  it('maps API results to overlay markers', () => {
    const place = toUtilityOverlayPlace(
      {
        id: 'osm-node-1',
        placeId: 'osm-node-1',
        name: 'City ATM',
        latitude: 12.3,
        longitude: 76.4,
        distanceMeters: 450,
        category: 'ATMs',
      },
      'atm'
    )
    assert.equal(place.lat, 12.3)
    assert.equal(place.lng, 76.4)
    assert.equal(place.displayName, 'City ATM')
    assert.equal(place._isUtility, true)
    assert.equal(getUtilityTypeMeta('atm')?.color, place.markerColor)
  })
})
