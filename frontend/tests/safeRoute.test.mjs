/**
 * Unit tests for Safe Route scoring helpers (backend service, pure functions).
 */
import assert from 'node:assert/strict'
import {
  scoreRoute,
  scoreAndTagRoutes,
  findNearbyRiskWarning,
  routesBoundingBox,
  DEFAULT_AVOID_OPTIONS,
} from '../../backend/services/safeRouteService.js'

function makeRoute(coords, { duration = 600, distance = 5000, steps = [] } = {}) {
  return {
    duration,
    distance,
    geometry: { type: 'LineString', coordinates: coords },
    steps,
    routeTags: [],
  }
}

const mainRoad = makeRoute(
  [
    [77.59, 12.97],
    [77.6, 12.98],
    [77.61, 12.99],
  ],
  {
    duration: 800,
    distance: 4000,
    steps: [
      { name: 'Ring Road', distance: 2000 },
      { name: 'MG Road', distance: 2000 },
    ],
  }
)

const isolated = makeRoute(
  [
    [77.59, 12.97],
    [77.595, 12.975],
    [77.61, 12.99],
  ],
  {
    duration: 500,
    distance: 3500,
    steps: [
      { name: 'unnamed', distance: 2000 },
      { name: 'track', distance: 1500 },
    ],
  }
)

const hazards = [
  {
    id: 'h1',
    type: 'flood',
    latitude: 12.975,
    longitude: 77.595,
    severity: 4,
  },
]

{
  const scored = scoreRoute(mainRoad, [], DEFAULT_AVOID_OPTIONS)
  assert.ok(scored.safetyScore >= 70, 'main road should score reasonably high')
  assert.equal(scored.riskySegmentCount, 0)
  assert.ok(scored.safetyReasons?.safe?.length >= 1, 'should explain why safer')
  assert.ok(
    scored.safetyReasons.safe.some((r) => r.id === 'main_roads' || r.id === 'no_hazards'),
    'safe reasons should mention main roads or no hazards'
  )
}

{
  const scored = scoreRoute(isolated, hazards, DEFAULT_AVOID_OPTIONS)
  assert.ok(scored.safetyScore < 70, 'isolated + flood should score lower')
  assert.ok(scored.riskySegmentCount >= 1)
  assert.ok(scored.alerts.length >= 1)
  assert.ok(scored.safetyReasons?.risk?.length >= 1, 'should explain risks')
  assert.ok(
    scored.safetyReasons.risk.some((r) => r.id === 'flood' || r.type === 'flood'),
    'risk reasons should include flood'
  )
  assert.ok(
    scored.safetyReasons.risk.some((r) => r.id === 'isolated_roads'),
    'risk reasons should include isolated roads'
  )
}

{
  const tagged = scoreAndTagRoutes([isolated, mainRoad], hazards, DEFAULT_AVOID_OPTIONS)
  assert.equal(tagged.length, 2)
  const safest = tagged.find((r) => r.routeTags.includes('safest'))
  assert.ok(safest, 'must tag a safest route')
  assert.ok(
    safest.safetyScore >= Math.max(...tagged.map((r) => r.safetyScore)),
    'safest should have max score'
  )
}

{
  const bbox = routesBoundingBox([mainRoad])
  assert.ok(bbox)
  assert.ok(bbox.south < bbox.north)
  assert.ok(bbox.west < bbox.east)
}

{
  const warning = findNearbyRiskWarning(
    { lat: 12.975, lng: 77.595 },
    [{ type: 'accident', latitude: 12.9751, longitude: 77.5951, severity: 3 }],
    300
  )
  assert.ok(warning)
  assert.equal(warning.type, 'accident')
}

{
  const none = findNearbyRiskWarning({ lat: 0, lng: 0 }, hazards, 50)
  assert.equal(none, null)
}

console.log('safeRouteService tests passed')
