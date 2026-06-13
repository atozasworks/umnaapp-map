/**
 * Place provenance / audit trail.
 *
 * Records every lifecycle event for a place (created / updated / approved /
 * rejected / deleted / restored) as an immutable PlaceAudit row. Each row keeps
 * a per-event diff (`changes`) and a full snapshot of the audited fields
 * (`snapshot`) so admins can view previous versions and restore them.
 *
 * All writes are best-effort: failures never block the underlying place action.
 */

import prisma from '../config/database.js'

export const PLACE_AUDIT_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELETED: 'deleted',
  RESTORED: 'restored',
}

/**
 * Fields that make up a place "version". Order defines display order in the
 * diff viewer. `label` is the human name shown to the public; `type` drives
 * value formatting on the client.
 */
export const AUDITED_FIELDS = [
  { key: 'placeNameEn', label: 'Name', type: 'text' },
  { key: 'placeNameLocal', label: 'Local name', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'latitude', label: 'Latitude', type: 'coord' },
  { key: 'longitude', label: 'Longitude', type: 'coord' },
  { key: 'zoomLevel', label: 'Zoom level', type: 'number' },
  { key: 'approvalStatus', label: 'Approval status', type: 'status' },
  { key: 'source', label: 'Source', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'fullAddress', label: 'Full address', type: 'text' },
  { key: 'vicinity', label: 'Vicinity', type: 'text' },
  { key: 'village', label: 'Village', type: 'text' },
  { key: 'taluk', label: 'Taluk', type: 'text' },
  { key: 'district', label: 'District', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'pincode', label: 'Pincode', type: 'text' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviewCount', label: 'Review count', type: 'number' },
  { key: 'businessStatus', label: 'Business status', type: 'text' },
  { key: 'googleMapsUrl', label: 'Google Maps URL', type: 'text' },
  { key: 'festivalStartDate', label: 'Festival start', type: 'date' },
  { key: 'festivalEndDate', label: 'Festival end', type: 'date' },
  { key: 'festivalRecurrence', label: 'Festival recurrence', type: 'text' },
]

const AUDITED_KEYS = AUDITED_FIELDS.map((f) => f.key)

/** Fields applied when restoring a previous version (mutable place columns). */
export const RESTORABLE_KEYS = [
  'placeNameEn',
  'placeNameLocal',
  'category',
  'latitude',
  'longitude',
  'zoomLevel',
  'description',
  'phone',
  'website',
  'fullAddress',
  'vicinity',
  'village',
  'taluk',
  'district',
  'state',
  'country',
  'pincode',
  'rating',
  'reviewCount',
  'businessStatus',
  'googleMapsUrl',
  'festivalStartDate',
  'festivalEndDate',
  'festivalRecurrence',
]

function normalizeValue(value) {
  if (value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

/** Pick the audited subset of a place row into a comparable snapshot. */
export function snapshotPlace(place) {
  if (!place) return {}
  const snap = {}
  for (const key of AUDITED_KEYS) {
    let v = place[key]
    // Accept the legacy `name` column when placeNameEn is absent.
    if (key === 'placeNameEn' && v == null) v = place.name
    snap[key] = normalizeValue(v)
  }
  return snap
}

function valuesEqual(a, b) {
  const na = a == null ? null : a
  const nb = b == null ? null : b
  if (na === nb) return true
  if (na == null || nb == null) return false
  if (typeof na === 'number' && typeof nb === 'number') {
    return Math.abs(na - nb) < 1e-9
  }
  return JSON.stringify(na) === JSON.stringify(nb)
}

/**
 * Diff two place rows over the audited field set.
 * Returns `{ field: { old, new } }` for every changed field.
 */
export function computeChanges(before, after) {
  const beforeSnap = snapshotPlace(before)
  const afterSnap = snapshotPlace(after)
  const changes = {}
  for (const key of AUDITED_KEYS) {
    const oldV = beforeSnap[key] ?? null
    const newV = afterSnap[key] ?? null
    if (!valuesEqual(oldV, newV)) {
      changes[key] = { old: oldV, new: newV }
    }
  }
  return changes
}

/** Build an actor descriptor from an authenticated map user (req.user). */
export function userActor(user) {
  if (!user) return systemActor()
  return {
    actorType: 'user',
    actorId: user.id ?? null,
    actorName: user.name || user.email || 'A user',
  }
}

/** Admin panel has no user identity (shared secret) — log as a generic admin. */
export function adminActor(name) {
  return { actorType: 'admin', actorId: null, actorName: name || 'Admin' }
}

/** Automated / scheduler actions. */
export function systemActor(name) {
  return { actorType: 'system', actorId: null, actorName: name || 'System' }
}

/**
 * Write one audit row. Best-effort: never throws.
 *
 * @param {object} opts
 * @param {string} opts.placeId
 * @param {string} opts.action  one of PLACE_AUDIT_ACTIONS
 * @param {object} opts.actor   { actorType, actorId, actorName }
 * @param {object} [opts.before] place row before the change (for diffs)
 * @param {object} [opts.after]  place row after the change (snapshot source)
 * @param {object} [opts.changesOverride] explicit changes object
 * @param {string} [opts.note]
 */
export async function recordPlaceAudit({
  placeId,
  action,
  actor,
  before = null,
  after = null,
  changesOverride = null,
  note = null,
}) {
  try {
    if (!prisma.placeAudit) return null
    if (!placeId || !action) return null

    const resolvedActor = actor || systemActor()
    const snapshotSource = after || before
    const snapshot = snapshotSource ? snapshotPlace(snapshotSource) : null

    let changes = changesOverride
    if (!changes) {
      if (action === PLACE_AUDIT_ACTIONS.CREATED && after) {
        changes = snapshotPlace(after)
      } else if (action === PLACE_AUDIT_ACTIONS.DELETED && before) {
        changes = snapshotPlace(before)
      } else if (before && after) {
        changes = computeChanges(before, after)
      }
    }

    return await prisma.placeAudit.create({
      data: {
        placeId,
        action,
        actorType: resolvedActor.actorType || 'system',
        actorId: resolvedActor.actorId ?? null,
        actorName: resolvedActor.actorName ?? null,
        changes: changes ?? undefined,
        snapshot: snapshot ?? undefined,
        note: note ?? undefined,
      },
    })
  } catch (e) {
    console.warn('[audit] recordPlaceAudit failed:', e.message)
    return null
  }
}

/** Fire-and-forget variant for use inside request handlers. */
export function recordPlaceAuditAsync(opts) {
  recordPlaceAudit(opts).catch((e) => console.warn('[audit] async record failed:', e.message))
}

export function serializeAudit(row) {
  if (!row) return null
  return {
    id: row.id,
    placeId: row.placeId,
    action: row.action,
    actorType: row.actorType,
    // actorId intentionally omitted from public payload (privacy)
    actorName: row.actorName || null,
    changes: row.changes ?? null,
    snapshot: row.snapshot ?? null,
    note: row.note || null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }
}

/**
 * Full chronological history for a place (newest first).
 * @param {string} placeId
 * @param {object} [opts]
 * @param {boolean} [opts.includeSnapshot] include version snapshots (admin only)
 */
export async function getPlaceHistory(placeId, { includeSnapshot = false } = {}) {
  if (!prisma.placeAudit || !placeId) return []
  const rows = await prisma.placeAudit.findMany({
    where: { placeId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return rows.map((row) => {
    const out = serializeAudit(row)
    if (!includeSnapshot) delete out.snapshot
    return out
  })
}
