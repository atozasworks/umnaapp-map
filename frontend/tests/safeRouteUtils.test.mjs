/**
 * Client-side Safe Route helper smoke tests.
 */
import assert from 'node:assert/strict'
import {
  primarySafeRouteTag,
  buildSafeRouteMapStyles,
  estimateFuelLiters,
  formatSafetyScore,
  formatSafetyImpact,
  getRouteSafetyDetails,
  safetyScoreColor,
  DEFAULT_SAFE_AVOID_OPTIONS,
} from '../src/utils/safeRoute.js'

assert.equal(primarySafeRouteTag(['fastest', 'safest']), 'safest')
assert.equal(primarySafeRouteTag(['shortest']), 'shortest')
assert.equal(formatSafetyScore(87.2), '87')
assert.equal(safetyScoreColor(90), '#059669')
assert.equal(estimateFuelLiters(10000, 'driving'), 0.8)
assert.equal(estimateFuelLiters(10000, 'walking'), null)
assert.ok(DEFAULT_SAFE_AVOID_OPTIONS.avoidFloodProne)
assert.equal(formatSafetyImpact(12), '+12')
assert.equal(formatSafetyImpact(-8), '-8')
assert.equal(formatSafetyImpact(0), null)

{
  const details = getRouteSafetyDetails({
    safetyReasons: {
      safe: [{ id: 'main_roads', message: 'Uses mostly named or main roads', impact: 10 }],
      risk: [{ id: 'flood', message: 'Flooded road reported ahead', impact: -20 }],
    },
  })
  assert.equal(details.safe.length, 1)
  assert.equal(details.risk[0].id, 'flood')
}

{
  const details = getRouteSafetyDetails({
    safetyScore: 82,
    roadComposition: { mainRoadRatio: 0.8, isolatedRatio: 0.05 },
    safetyAlerts: [],
  })
  assert.ok(details.safe.some((r) => r.id === 'main_roads' || r.id === 'no_hazards'))
}

const styles = buildSafeRouteMapStyles([
  { routeTags: ['safest'] },
  { routeTags: ['fastest'] },
])
assert.equal(styles[0].color, '#059669')
assert.equal(styles[1].color, '#2563EB')

console.log('frontend safeRoute util tests passed')
