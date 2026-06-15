import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import prisma from '../config/database.js'
import { serializePlace } from '../utils/placePayload.js'
import { enrichPlaceApprovalMeta } from '../services/placeApproval.js'

const router = express.Router()

/** Derive a simple contribution score from a user's activity counts. */
function contributionScore({ approvedPlaces = 0, reviews = 0, photos = 0 }) {
  return approvedPlaces * 10 + reviews * 3 + photos * 2
}

/** Compute earned badges from activity counts (display-only, no storage). */
function computeBadges({ approvedPlaces = 0, reviews = 0, photos = 0 }) {
  const badges = []
  if (approvedPlaces >= 1) badges.push({ id: 'contributor', label: 'Contributor' })
  if (approvedPlaces >= 10) badges.push({ id: 'top_contributor', label: 'Top Contributor' })
  if (approvedPlaces >= 50) badges.push({ id: 'mapper', label: 'Community Mapper' })
  if (reviews >= 5) badges.push({ id: 'reviewer', label: 'Reviewer' })
  if (photos >= 5) badges.push({ id: 'photographer', label: 'Photographer' })
  return badges
}

/**
 * @route GET /api/users/me/contributions
 * @desc Authenticated user's own contribution center: places grouped by
 *       approval status, their reviews, photos, favorites, and statistics.
 * @access Private
 */
router.get(
  '/me/contributions',
  authenticateToken,
  rateLimitMiddleware('users:contributions', 60, 60),
  async (req, res) => {
    try {
      const userId = req.user.id

      const [places, reviews, photos, favorites] = await Promise.all([
        prisma.place.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        prisma.placeReview
          ? prisma.placeReview.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              include: { place: { select: { id: true, name: true, placeNameEn: true } } },
            })
          : [],
        prisma.placePhoto
          ? prisma.placePhoto.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              include: { place: { select: { id: true, name: true, placeNameEn: true } } },
            })
          : [],
        prisma.favorite
          ? prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
          : [],
      ])

      const serializedPlaces = places.map((p) => enrichPlaceApprovalMeta(serializePlace(p)))
      const approved = serializedPlaces.filter((p) => p.approvalStatus === 'approved')
      const pending = serializedPlaces.filter((p) => p.approvalStatus === 'pending')
      const rejected = serializedPlaces.filter((p) => p.approvalStatus === 'rejected')

      const stats = {
        totalContributions: places.length + reviews.length + photos.length,
        totalPlaces: places.length,
        approvedPlaces: approved.length,
        pendingPlaces: pending.length,
        rejectedPlaces: rejected.length,
        reviews: reviews.length,
        photos: photos.length,
        favorites: favorites.length,
        contributionScore: contributionScore({
          approvedPlaces: approved.length,
          reviews: reviews.length,
          photos: photos.length,
        }),
      }

      res.json({
        stats,
        badges: computeBadges({
          approvedPlaces: approved.length,
          reviews: reviews.length,
          photos: photos.length,
        }),
        places: { all: serializedPlaces, approved, pending, rejected },
        reviews: reviews.map((r) => ({
          id: r.id,
          placeId: r.placeId,
          placeName: r.place?.placeNameEn || r.place?.name || null,
          rating: r.rating,
          comment: r.comment || null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        photos: photos.map((ph) => ({
          id: ph.id,
          placeId: ph.placeId,
          placeName: ph.place?.placeNameEn || ph.place?.name || null,
          dataUrl: ph.dataUrl,
          caption: ph.caption || null,
          createdAt: ph.createdAt,
        })),
        favorites: favorites.map((f) => ({
          id: f.id,
          placeId: f.placeId,
          name: f.name,
          latitude: f.latitude,
          longitude: f.longitude,
          category: f.category,
          createdAt: f.createdAt,
        })),
      })
    } catch (error) {
      console.error('My contributions error:', error)
      res.status(500).json({ error: 'Failed to load contributions', message: error.message })
    }
  }
)

/**
 * @route GET /api/users/:id/public
 * @desc Public profile for a user: name, picture, joined date, activity stats,
 *       badges, and recent approved place contributions + public reviews.
 *       Respects the user's profilePublic privacy setting.
 * @access Private (must be signed in to view profiles)
 */
router.get(
  '/:id/public',
  authenticateToken,
  rateLimitMiddleware('users:public', 120, 60),
  async (req, res) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return res.status(400).json({ error: 'User ID required' })

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          picture: true,
          createdAt: true,
          profilePublic: true,
        },
      })
      if (!user) return res.status(404).json({ error: 'User not found' })

      const isSelf = req.user.id === id
      if (user.profilePublic === false && !isSelf) {
        return res.json({
          user: { id: user.id, name: user.name, profilePublic: false },
          private: true,
          message: 'This profile is private.',
        })
      }

      const [approvedPlaces, reviewCount, photoCount, recentPlaces, recentReviews] = await Promise.all([
        prisma.place.count({ where: { userId: id, approvalStatus: 'approved' } }),
        prisma.placeReview ? prisma.placeReview.count({ where: { userId: id } }) : 0,
        prisma.placePhoto ? prisma.placePhoto.count({ where: { userId: id } }) : 0,
        prisma.place.findMany({
          where: { userId: id, approvalStatus: 'approved' },
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
        prisma.placeReview
          ? prisma.placeReview.findMany({
              where: { userId: id },
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: { place: { select: { id: true, name: true, placeNameEn: true } } },
            })
          : [],
      ])

      const counts = { approvedPlaces, reviews: reviewCount, photos: photoCount }
      res.json({
        user: {
          id: user.id,
          name: user.name,
          picture: user.picture || null,
          joinedDate: user.createdAt,
          profilePublic: user.profilePublic !== false,
        },
        private: false,
        stats: {
          ...counts,
          contributionScore: contributionScore(counts),
        },
        badges: computeBadges(counts),
        contributions: recentPlaces.map((p) => enrichPlaceApprovalMeta(serializePlace(p))),
        reviews: recentReviews.map((r) => ({
          id: r.id,
          placeId: r.placeId,
          placeName: r.place?.placeNameEn || r.place?.name || null,
          rating: r.rating,
          comment: r.comment || null,
          createdAt: r.createdAt,
        })),
      })
    } catch (error) {
      console.error('Public profile error:', error)
      res.status(500).json({ error: 'Failed to load profile', message: error.message })
    }
  }
)

export default router
