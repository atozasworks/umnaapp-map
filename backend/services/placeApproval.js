import prisma from '../config/database.js'
import { onPlacesAutoApproved } from './notificationService.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function getAutoApproveDays() {
  const n = parseInt(process.env.PLACE_AUTO_APPROVE_DAYS, 10)
  return Number.isFinite(n) && n > 0 ? n : 10
}

export function getAutoApproveMs() {
  return getAutoApproveDays() * DAY_MS
}

export function autoApproveCutoffDate() {
  return new Date(Date.now() - getAutoApproveMs())
}

export function pendingAutoApproveAt(createdAt) {
  return new Date(new Date(createdAt).getTime() + getAutoApproveMs())
}

/** Fields set when a place is created (extracted or manually added). */
export function initialApprovalFields(createdAt = new Date()) {
  return {
    approvalStatus: 'pending',
    approvedAt: null,
    autoApproveAt: pendingAutoApproveAt(createdAt),
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
  const cutoff = autoApproveCutoffDate()
  try {
    const toApprove = await prisma.place.findMany({
      where: {
        approvalStatus: 'pending',
        OR: [
          { autoApproveAt: { lte: now } },
          { autoApproveAt: null, createdAt: { lte: cutoff } },
        ],
      },
      select: { id: true },
    })
    if (!toApprove.length) return { count: 0 }

    const ids = toApprove.map((p) => p.id)
    const result = await prisma.place.updateMany({
      where: { id: { in: ids } },
      data: {
        approvalStatus: 'approved',
        approvedAt: now,
        autoApproveAt: null,
      },
    })
    if (result.count > 0) {
      onPlacesAutoApproved(ids).catch(() => {})
    }
    return { count: result.count }
  } catch (e) {
    console.warn('autoApproveExpiredPendingPlaces:', e.message)
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
  const out = {
    ...place,
    approvalStatus: st,
    approvedAt: place.approvedAt ?? null,
    autoApproveAt: place.autoApproveAt ?? null,
  }
  if (st === 'pending') {
    const autoAt =
      place.autoApproveAt != null
        ? new Date(place.autoApproveAt)
        : place.createdAt
          ? pendingAutoApproveAt(place.createdAt)
          : null
    if (autoAt) {
      out.autoApproveAt = autoAt.toISOString()
      out.pendingDaysRemaining = pendingDaysRemaining(autoAt)
    }
  }
  return out
}

export function startPlaceApprovalScheduler() {
  const HOUR = 60 * 60 * 1000
  autoApproveExpiredPendingPlaces()
    .then(({ count }) => {
      if (count > 0) console.log(`Place approval: auto-approved ${count} pending place(s)`)
    })
    .catch(() => {})
  setInterval(() => {
    autoApproveExpiredPendingPlaces()
      .then(({ count }) => {
        if (count > 0) console.log(`Place approval: auto-approved ${count} pending place(s)`)
      })
      .catch(() => {})
  }, HOUR)
}
