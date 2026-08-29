import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PUBLIC_UTILITY_TYPES,
  getUtilityType,
  listUtilityTypeIds,
  UTILITY_RADIUS_METERS,
} from '../config/publicUtilities.js'

describe('publicUtilities config', () => {
  it('lists all required utility types', () => {
    const ids = listUtilityTypeIds()
    assert.equal(ids.length, 10)
    assert.ok(getUtilityType('toilets'))
    assert.ok(getUtilityType('atm')?.dbCategories.includes('ATM'))
    assert.ok(PUBLIC_UTILITY_TYPES.every((t) => t.osmFilters?.length))
  })

  it('allows only 1/2/5/10 km radii', () => {
    assert.deepEqual(UTILITY_RADIUS_METERS, [1000, 2000, 5000, 10000])
  })
})
