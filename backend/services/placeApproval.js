import prisma from '../config/database.js'

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

export async function autoApproveExpiredPendingPlaces() {
  if (!prisma.place) return { count: 0 }
  const cutoff = autoApproveCutoffDate()
  try {
    const result = await prisma.place.updateMany({
      where: {
        approvalStatus: 'pending',
        createdAt: { lte: cutoff },
      },
      data: {
        approvalStatus: 'approved',
        approvedAt: new Date(),
      },
    })
    return { count: result.count }
  } catch (e) {
    console.warn('autoApproveExpiredPendingPlaces:', e.message)
    return { count: 0 }
  }
}

/** DB filter: approved for everyone, or pending only for the contributor */
export function placePublicVisibilityOr(viewerUserId) {
  return {
    OR: [
      { approvalStatus: 'approved' },
      { AND: [{ approvalStatus: 'pending' }, { userId: viewerUserId }] },
    ],
  }
}

export function isPlaceVisibleToUser(place, viewerUserId) {
  if (!place) return false
  const st = place.approvalStatus ?? 'approved'
  if (st === 'approved') return true
  if (st === 'pending') return place.userId === viewerUserId
  return false
}

export function pendingAutoApproveAt(createdAt) {
  return new Date(new Date(createdAt).getTime() + getAutoApproveMs())
}

export function startPlaceApprovalScheduler() {
  const HOUR = 60 * 60 * 1000
  autoApproveExpiredPendingPlaces().catch(() => {})
  setInterval(() => {
    autoApproveExpiredPendingPlaces().catch(() => {})
  }, HOUR)
}
