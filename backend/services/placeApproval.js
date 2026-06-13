import prisma from '../config/database.js'
import { onPlacesAutoApproved, notifyFestivalsStartingToday } from './notificationService.js'
import { getFestivalRecurrence, getFestivalEnd } from '../utils/festival.js'
import {
  recordPlaceAuditAsync,
  systemActor,
  PLACE_AUDIT_ACTIONS,
} from './placeAudit.js'
import { PLACE_DETAIL_SELECT } from '../utils/placePayload.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function getExtractedAutoApproveDays() {
  const n = parseInt(process.env.PLACE_AUTO_APPROVE_DAYS_EXTRACTED, 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export function getManualAutoApproveDays() {
  const n = parseInt(process.env.PLACE_AUTO_APPROVE_DAYS_MANUAL, 10)
  if (Number.isFinite(n) && n > 0) return n
  const legacy = parseInt(process.env.PLACE_AUTO_APPROVE_DAYS, 10)
  return Number.isFinite(legacy) && legacy > 0 ? legacy : 5
}

/** @deprecated Use getAutoApprovePeriods() or getAutoApproveDaysForPlace() */
export function getAutoApproveDays() {
  return getManualAutoApproveDays()
}

export function getAutoApprovePeriods() {
  return {
    extracted: getExtractedAutoApproveDays(),
    manual: getManualAutoApproveDays(),
  }
}

export function isExtractedPlace(place) {
  if (!place) return false
  const at = place.extractedAt ?? place.extracted_at
  if (at == null) return false
  const d = new Date(at)
  return !Number.isNaN(d.getTime())
}

export function getPlaceAddKind(place) {
  return isExtractedPlace(place) ? 'extracted' : 'manual'
}

export function getAutoApproveDaysForPlace(place) {
  return getPlaceAddKind(place) === 'extracted'
    ? getExtractedAutoApproveDays()
    : getManualAutoApproveDays()
}

export function getAutoApproveMsForPlace(place) {
  return getAutoApproveDaysForPlace(place) * DAY_MS
}

export function pendingAutoApproveAt(createdAt, placeOrKind = 'manual') {
  const kind =
    typeof placeOrKind === 'string'
      ? placeOrKind
      : getPlaceAddKind(placeOrKind)
  const days =
    kind === 'extracted' ? getExtractedAutoApproveDays() : getManualAutoApproveDays()
  return new Date(new Date(createdAt).getTime() + days * DAY_MS)
}

export function resolveAutoApproveAt(place) {
  if (!place) return null
  const raw = place.autoApproveAt ?? place.auto_approve_at
  if (raw != null) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d
  }
  const createdAt = place.createdAt
  if (!createdAt) return null
  return pendingAutoApproveAt(createdAt, place)
}

/** Fields set when a place is created (extracted or manually added). */
export function initialApprovalFields(createdAt = new Date(), { kind = 'manual' } = {}) {
  return {
    approvalStatus: 'pending',
    approvedAt: null,
    autoApproveAt: pendingAutoApproveAt(createdAt, kind),
  }
}

export function pendingDaysRemaining(autoApproveAt) {
  if (!autoApproveAt) return null
  const ms = new Date(autoApproveAt).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / DAY_MS)
}

export async function autoApproveExpiredPendingPlaces() {
  if (!prisma.place) return { count: 0 }
  const now = new Date()
  try {
    const pending = await prisma.place.findMany({
      where: { approvalStatus: 'pending' },
      select: { id: true, autoApproveAt: true, createdAt: true, extractedAt: true },
    })
    const ids = pending
      .filter((p) => {
        const at = resolveAutoApproveAt(p)
        return at && at.getTime() <= now.getTime()
      })
      .map((p) => p.id)
    if (!ids.length) return { count: 0 }

    const result = await prisma.place.updateMany({
      where: { id: { in: ids } },
      data: {
        approvalStatus: 'approved',
        approvedAt: now,
        autoApproveAt: null,
      },
    })
    if (result.count > 0) {
      for (const id of ids) {
        recordPlaceAuditAsync({
          placeId: id,
          action: PLACE_AUDIT_ACTIONS.APPROVED,
          actor: systemActor('Auto-approval'),
          changesOverride: { approvalStatus: { old: 'pending', new: 'approved' } },
          note: 'Auto-approved after review window elapsed',
        })
      }
      onPlacesAutoApproved(ids).catch(() => {})
    }
    return { count: result.count }
  } catch (e) {
    console.warn('autoApproveExpiredPendingPlaces:', e.message)
    return { count: 0 }
  }
}

/**
 * Auto-remove festival / jatre markers once they are over.
 * One-time festivals are deleted after their end date passes. Yearly festivals
 * roll forward to next year's occurrence (never expire), so they are kept.
 */
export async function removeExpiredFestivals() {
  if (!prisma.place) return { count: 0 }
  const now = new Date()
  try {
    const candidates = await prisma.place.findMany({
      where: {
        OR: [{ category: 'Festival' }, { festivalStartDate: { not: null } }],
      },
      select: PLACE_DETAIL_SELECT,
    })
    const expired = candidates.filter((p) => {
      if (getFestivalRecurrence(p) === 'yearly') return false // recurs → keep
      const end = getFestivalEnd(p)
      return end && end.getTime() < now.getTime()
    })
    const expiredIds = expired.map((p) => p.id)
    if (!expiredIds.length) return { count: 0 }

    const result = await prisma.place.deleteMany({ where: { id: { in: expiredIds } } })
    for (const p of expired) {
      recordPlaceAuditAsync({
        placeId: p.id,
        action: PLACE_AUDIT_ACTIONS.DELETED,
        actor: systemActor('Festival cleanup'),
        before: p,
        note: 'Auto-removed after festival window ended',
      })
    }
    return { count: result.count }
  } catch (e) {
    console.warn('removeExpiredFestivals:', e.message)
    return { count: 0 }
  }
}

/**
 * Map visibility: approved → everyone; pending/rejected → contributor only.
 * Admin panel uses separate routes (adminAuth), not this filter.
 */
export function placePublicVisibilityOr(viewerUserId) {
  return {
    OR: [
      { approvalStatus: 'approved' },
      {
        AND: [
          { approvalStatus: { in: ['pending', 'rejected'] } },
          { userId: viewerUserId },
        ],
      },
    ],
  }
}

export function isPlaceVisibleToUser(place, viewerUserId) {
  if (!place) return false
  const st = place.approvalStatus ?? 'approved'
  if (st === 'approved') return true
  if (st === 'pending' || st === 'rejected') return place.userId === viewerUserId
  return false
}

export function enrichPlaceApprovalMeta(place) {
  if (!place) return place
  const st = place.approvalStatus ?? 'approved'
  const addKind = getPlaceAddKind(place)
  const autoApproveDays = getAutoApproveDaysForPlace(place)
  const out = {
    ...place,
    approvalStatus: st,
    approvedAt: place.approvedAt ?? null,
    placeAddKind: addKind,
    autoApproveDays,
  }
  if (st === 'pending') {
    const autoAt = resolveAutoApproveAt(place)
    if (autoAt) {
      out.autoApproveAt = autoAt.toISOString()
      out.auto_approve_at = autoAt.toISOString()
      out.pendingDaysRemaining = pendingDaysRemaining(autoAt)
    }
  } else {
    const raw = place.autoApproveAt ?? place.auto_approve_at
    out.autoApproveAt = raw ?? null
    out.auto_approve_at = raw ?? null
  }
  return out
}

export function startPlaceApprovalScheduler() {
  const HOUR = 60 * 60 * 1000
  const runMaintenance = () => {
    autoApproveExpiredPendingPlaces()
      .then(({ count }) => {
        if (count > 0) console.log(`Place approval: auto-approved ${count} pending place(s)`)
      })
      .catch(() => {})
    notifyFestivalsStartingToday()
      .then(({ count }) => {
        if (count > 0) console.log(`Festivals: broadcast start notification for ${count} festival(s)`)
      })
      .catch(() => {})
    removeExpiredFestivals()
      .then(({ count }) => {
        if (count > 0) console.log(`Festivals: auto-removed ${count} expired festival(s)`)
      })
      .catch(() => {})
  }
  runMaintenance()
  setInterval(runMaintenance, HOUR)
}
