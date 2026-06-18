/**
 * Public real-time place events.
 *
 * Broadcasts approved-place lifecycle changes to the anonymous `/public-maps`
 * Socket.io namespace so embedded maps, external projects, and mobile apps stay
 * in sync without polling or a separate sync job. Only approved-place data is
 * ever emitted, and the payload is the same sanitized shape returned by the
 * public REST API (no private fields).
 *
 * This module is best-effort: if Socket.io is not initialized yet (or no
 * clients are connected) the calls are no-ops and never throw, so they are safe
 * to fire-and-forget from existing request handlers.
 */

import { getIo } from './socketIo.js'
import { serializePublicPlace, getPublicPlaceById } from '../services/publicPlaceQuery.js'

/** Namespace used by public/embedded clients (no auth). */
export const PUBLIC_NAMESPACE = '/public-maps'

export const PLACE_EVENTS = {
  CREATED: 'place:created',
  UPDATED: 'place:updated',
  APPROVED: 'place:approved',
  DELETED: 'place:deleted',
}

function publicNsp() {
  const io = getIo()
  if (!io) return null
  try {
    return io.of(PUBLIC_NAMESPACE)
  } catch {
    return null
  }
}

/**
 * Emit a place event to all public-map subscribers.
 * @param {string} event one of PLACE_EVENTS
 * @param {object} payload event body (already sanitized)
 */
function emitPublic(event, payload) {
  const nsp = publicNsp()
  if (!nsp) return
  try {
    nsp.emit(event, { type: event, place: payload, at: new Date().toISOString() })
  } catch (err) {
    console.warn('[placeEvents] emit failed:', err.message)
  }
}

/**
 * Broadcast a created/updated/approved place. Accepts a raw Place row (it will
 * be sanitized) and re-reads from the DB when needed to guarantee the place is
 * actually approved before exposing it publicly.
 *
 * @param {string} event PLACE_EVENTS.CREATED | UPDATED | APPROVED
 * @param {object} place a Place row (or anything with an `id`)
 */
export async function broadcastPlaceUpsert(event, place) {
  try {
    if (!place) return
    // A place is only public once approved. Trust an explicitly approved row;
    // otherwise verify against the DB (admin/auto paths pass partial rows).
    let payload = null
    if (place.approvalStatus === 'approved' && place.latitude != null) {
      payload = serializePublicPlace(place)
    } else if (place.id) {
      payload = await getPublicPlaceById(place.id)
    }
    if (!payload) return
    emitPublic(event, payload)
  } catch (err) {
    console.warn('[placeEvents] broadcastPlaceUpsert error:', err.message)
  }
}

/**
 * Broadcast that a place is no longer publicly visible (deleted or rejected).
 * Sends a minimal payload so clients can drop the marker.
 * @param {string} placeId
 */
export function broadcastPlaceRemoved(placeId) {
  if (!placeId) return
  emitPublic(PLACE_EVENTS.DELETED, { id: String(placeId) })
}
