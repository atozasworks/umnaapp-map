import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  stabilizeRoutingStart,
  distanceMetersLatLng,
  routeStopsSignature,
  ROUTING_GPS_MOVE_THRESHOLD_M,
} from '../src/utils/routeHelpers.js'

test('stabilizeRoutingStart keeps the first GPS fix', () => {
  const live = { lat: 12.742917, lng: 75.504553, name: 'My location' }
  const frozen = stabilizeRoutingStart(null, live)
  assert.equal(frozen.lat, live.lat)
  assert.equal(frozen.lng, live.lng)
})

test('stabilizeRoutingStart ignores GPS jitter under the move threshold', () => {
  const origin = { lat: 12.742917, lng: 75.504553, name: 'My location' }
  const frozen = stabilizeRoutingStart(null, origin)
  // ~11m of jitter — well under 80m — must not move the routing start.
  const jittered = { lat: origin.lat + 0.0001, lng: origin.lng, name: 'My location' }
  assert.ok(distanceMetersLatLng(origin, jittered) < ROUTING_GPS_MOVE_THRESHOLD_M)
  const next = stabilizeRoutingStart(frozen, jittered)
  assert.equal(next, frozen)
})

test('stabilizeRoutingStart updates after a real move', () => {
  const origin = { lat: 12.742917, lng: 75.504553, name: 'My location' }
  const frozen = stabilizeRoutingStart(null, origin)
  const moved = { lat: origin.lat + 0.002, lng: origin.lng, name: 'My location' }
  assert.ok(distanceMetersLatLng(origin, moved) > ROUTING_GPS_MOVE_THRESHOLD_M)
  const next = stabilizeRoutingStart(frozen, moved)
  assert.equal(next.lat, moved.lat)
  assert.equal(next.lng, moved.lng)
})

test('routeStopsSignature is stable for the same coordinates', () => {
  const stops = [
    { lat: 12.74, lng: 75.5, name: 'A' },
    { lat: 12.7416548, lng: 75.4667147, name: 'B' },
  ]
  assert.equal(routeStopsSignature(stops), routeStopsSignature([...stops]))
  assert.notEqual(
    routeStopsSignature(stops),
    routeStopsSignature([{ lat: 12.75, lng: 75.5 }, stops[1]])
  )
})
