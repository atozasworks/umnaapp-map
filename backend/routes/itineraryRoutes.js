import express from 'express'
import { body, param, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import prisma from '../config/database.js'
import {
  ITINERARY_ROLES,
  ROLE_FOR_LINK_JOIN,
  ITINERARY_NOTIFICATION_TYPES,
  newShareToken,
  getItineraryForViewer,
  serializeItinerary,
  serializeStop,
  serializeComment,
  serializeMember,
  memberRole,
  assertRole,
  reorderStopsByVotes,
  normalizePositions,
  touchItinerary,
  broadcastItinerary,
  notifyMembers,
  notifyItineraryInvite,
  sendItineraryInviteEmail,
} from '../services/itineraryService.js'

const router = express.Router()

router.use(authenticateToken)

function modelUnavailable(res) {
  return res.status(503).json({
    error: 'Itineraries unavailable',
    message:
      'Run the migration: backend/prisma/add-itineraries.sql (or `npx prisma db push`), then `npx prisma generate` and restart the server.',
  })
}

/** Wrap a handler so missing-table / generation errors degrade to 503. */
function handle(fn) {
  return async (req, res) => {
    if (!prisma.itinerary) return modelUnavailable(res)
    try {
      await fn(req, res)
    } catch (e) {
      if (e?.status) return res.status(e.status).json({ error: e.message })
      // Prisma "table does not exist" → migration not applied yet.
      if (e?.code === 'P2021' || e?.code === 'P2022') return modelUnavailable(res)
      console.error('[itineraries]', req.method, req.path, e)
      res.status(500).json({ error: e.message || 'Internal server error' })
    }
  }
}

function validate(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return false
  }
  return true
}

/** Load itinerary with members (and optionally stops) or throw 404. */
async function requireItinerary(itineraryId, { withStops = false } = {}) {
  const it = await getItineraryForViewer(itineraryId, null, { withStops })
  if (!it) {
    const err = new Error('Itinerary not found')
    err.status = 404
    throw err
  }
  return it
}

async function respondItinerary(res, itineraryId, viewerUserId, status = 200) {
  const fresh = await getItineraryForViewer(itineraryId, viewerUserId, { withStops: true })
  res.status(status).json({ itinerary: serializeItinerary(fresh, viewerUserId) })
}

// ===========================================================================
// Itineraries (collection)
// ===========================================================================

/**
 * @route GET /api/itineraries
 * @desc List itineraries the user owns or is a member of
 * @access Private
 */
router.get(
  '/',
  handle(async (req, res) => {
    const userId = req.user.id
    const items = await prisma.itinerary.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, picture: true } } } },
        _count: { select: { stops: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    res.json({
      itineraries: items.map((it) => serializeItinerary(it, userId, { includeStops: false })),
    })
  })
)

/**
 * @route POST /api/itineraries
 * @desc Create a new itinerary (creator becomes owner + member)
 * @access Private
 */
router.post(
  '/',
  [
    body('title').trim().isLength({ min: 1, max: 120 }),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('coverEmoji').optional({ nullable: true }).isString().isLength({ max: 8 }),
    body('startDate').optional({ nullable: true }).isISO8601(),
    body('endDate').optional({ nullable: true }).isISO8601(),
  ],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const { title, description, coverEmoji, startDate, endDate } = req.body

    const itinerary = await prisma.itinerary.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        coverEmoji: coverEmoji || null,
        ownerId: userId,
        shareToken: newShareToken(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        members: {
          create: { userId, role: ITINERARY_ROLES.OWNER },
        },
      },
    })
    await respondItinerary(res, itinerary.id, userId, 201)
  })
)

/**
 * @route GET /api/itineraries/:id
 * @desc Get full itinerary (members + ordered stops with votes)
 * @access Private (members only)
 */
router.get(
  '/:id',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await getItineraryForViewer(req.params.id, userId, { withStops: true })
    if (!it) return res.status(404).json({ error: 'Itinerary not found' })
    assertRole(it, userId, ITINERARY_ROLES.VIEWER)
    res.json({ itinerary: serializeItinerary(it, userId) })
  })
)

/**
 * @route PATCH /api/itineraries/:id
 * @desc Update itinerary metadata (owner only)
 * @access Private
 */
router.patch(
  '/:id',
  [
    body('title').optional().trim().isLength({ min: 1, max: 120 }),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('coverEmoji').optional({ nullable: true }).isString().isLength({ max: 8 }),
    body('startDate').optional({ nullable: true }).isISO8601(),
    body('endDate').optional({ nullable: true }).isISO8601(),
    body('autoSort').optional().isBoolean(),
  ],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.OWNER)

    const data = {}
    if (req.body.title != null) data.title = req.body.title.trim()
    if ('description' in req.body) data.description = req.body.description?.trim() || null
    if ('coverEmoji' in req.body) data.coverEmoji = req.body.coverEmoji || null
    if ('startDate' in req.body) data.startDate = req.body.startDate ? new Date(req.body.startDate) : null
    if ('endDate' in req.body) data.endDate = req.body.endDate ? new Date(req.body.endDate) : null
    if ('autoSort' in req.body) data.autoSort = Boolean(req.body.autoSort)

    await prisma.itinerary.update({ where: { id: it.id }, data })

    if (data.autoSort) await reorderStopsByVotes(it.id)

    broadcastItinerary(it.id, 'itinerary:meta')
    await respondItinerary(res, it.id, userId)
  })
)

/**
 * @route DELETE /api/itineraries/:id
 * @desc Delete an itinerary (owner only)
 * @access Private
 */
router.delete(
  '/:id',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.OWNER)
    await prisma.itinerary.delete({ where: { id: it.id } })
    broadcastItinerary(it.id, 'itinerary:deleted')
    res.json({ success: true })
  })
)

/**
 * @route POST /api/itineraries/:id/leave
 * @desc Leave an itinerary (any non-owner member)
 * @access Private
 */
router.post(
  '/:id/leave',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    if (it.ownerId === userId) {
      return res.status(400).json({ error: 'The owner cannot leave. Delete the trip or transfer ownership.' })
    }
    await prisma.itineraryMember.deleteMany({ where: { itineraryId: it.id, userId } })
    broadcastItinerary(it.id, 'members:changed')
    res.json({ success: true })
  })
)

// ===========================================================================
// Members
// ===========================================================================

/**
 * @route POST /api/itineraries/:id/members
 * @desc Invite a user by email (owner only). Sends an email with a join link;
 *       the invitee becomes a member only once they accept and join, so the
 *       trip only ever shows for people who were invited AND joined.
 * @access Private
 */
router.post(
  '/:id/members',
  [body('email').trim().isEmail()],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.OWNER)

    const email = req.body.email.trim().toLowerCase()

    // Already part of the trip? Nothing to do.
    const invitee = await prisma.user.findUnique({ where: { email } })
    if (invitee && (invitee.id === it.ownerId || it.members.some((m) => m.userId === invitee.id))) {
      return res.status(409).json({ error: 'That person is already part of this trip.' })
    }

    // Email the invite link (works for existing accounts and new signups alike).
    const emailResult = await sendItineraryInviteEmail({ to: email, itinerary: it, inviter: req.user })

    // If they already have an account, also drop an in-app invite they can tap.
    if (invitee) {
      notifyItineraryInvite(it, invitee, req.user)
    }

    if (!emailResult.ok && !emailResult.skipped) {
      return res.status(502).json({
        error: 'Could not send the invite email. Use the Share link instead, or try again.',
      })
    }

    res.json({
      success: true,
      emailed: emailResult.ok,
      emailSkipped: Boolean(emailResult.skipped),
      message: emailResult.ok
        ? `Invitation emailed to ${email}.`
        : `Invite created. Email is not configured — share the link instead.`,
    })
  })
)

/**
 * @route PATCH /api/itineraries/:id/members/:userId
 * @desc Change a member's role (owner only)
 * @access Private
 */
router.patch(
  '/:id/members/:userId',
  [body('role').isIn(['editor', 'viewer'])],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.OWNER)

    const targetUserId = req.params.userId
    if (targetUserId === it.ownerId) {
      return res.status(400).json({ error: "The owner's role can't be changed." })
    }
    const updated = await prisma.itineraryMember.updateMany({
      where: { itineraryId: it.id, userId: targetUserId },
      data: { role: req.body.role },
    })
    if (updated.count === 0) return res.status(404).json({ error: 'Member not found' })
    broadcastItinerary(it.id, 'members:changed')
    await respondItinerary(res, it.id, userId)
  })
)

/**
 * @route DELETE /api/itineraries/:id/members/:userId
 * @desc Remove a member (owner only)
 * @access Private
 */
router.delete(
  '/:id/members/:userId',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.OWNER)
    const targetUserId = req.params.userId
    if (targetUserId === it.ownerId) {
      return res.status(400).json({ error: "The owner can't be removed." })
    }
    await prisma.itineraryMember.deleteMany({ where: { itineraryId: it.id, userId: targetUserId } })
    broadcastItinerary(it.id, 'members:changed')
    await respondItinerary(res, it.id, userId)
  })
)

// ===========================================================================
// Stops
// ===========================================================================

/**
 * @route POST /api/itineraries/:id/stops
 * @desc Add a stop (editor+)
 * @access Private
 */
router.post(
  '/:id/stops',
  [
    body('name').trim().isLength({ min: 1, max: 200 }),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('category').optional({ nullable: true }).isString(),
    body('address').optional({ nullable: true }).isString(),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('placeId').optional({ nullable: true }).isString(),
    body('dayIndex').optional({ nullable: true }).isInt({ min: 0 }),
  ],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.EDITOR)

    const last = await prisma.itineraryStop.findFirst({
      where: { itineraryId: it.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = (last?.position ?? -1) + 1

    const stop = await prisma.itineraryStop.create({
      data: {
        itineraryId: it.id,
        placeId: req.body.placeId || null,
        name: req.body.name.trim(),
        category: req.body.category || null,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        address: req.body.address || null,
        notes: req.body.notes?.trim() || null,
        dayIndex: req.body.dayIndex != null ? parseInt(req.body.dayIndex, 10) : null,
        position,
        addedById: userId,
        addedByName: req.user.name || null,
      },
    })
    await touchItinerary(it.id)
    broadcastItinerary(it.id, 'stops:changed', { stopId: stop.id })
    notifyMembers(it, {
      type: ITINERARY_NOTIFICATION_TYPES.UPDATED,
      title: '🗺️ Trip updated',
      body: `${req.user.name || 'A member'} added "${stop.name}" to "${it.title}".`,
      exceptUserId: userId,
    })
    await respondItinerary(res, it.id, userId, 201)
  })
)

/**
 * @route PATCH /api/itineraries/:id/stops/:stopId
 * @desc Edit a stop (editor+)
 * @access Private
 */
router.patch(
  '/:id/stops/:stopId',
  [
    body('name').optional().trim().isLength({ min: 1, max: 200 }),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('category').optional({ nullable: true }).isString(),
    body('dayIndex').optional({ nullable: true }).isInt({ min: 0 }),
  ],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.EDITOR)

    const stop = await prisma.itineraryStop.findFirst({
      where: { id: req.params.stopId, itineraryId: it.id },
    })
    if (!stop) return res.status(404).json({ error: 'Stop not found' })

    const data = {}
    if (req.body.name != null) data.name = req.body.name.trim()
    if ('notes' in req.body) data.notes = req.body.notes?.trim() || null
    if ('category' in req.body) data.category = req.body.category || null
    if ('dayIndex' in req.body) data.dayIndex = req.body.dayIndex != null ? parseInt(req.body.dayIndex, 10) : null

    await prisma.itineraryStop.update({ where: { id: stop.id }, data })
    await touchItinerary(it.id)
    broadcastItinerary(it.id, 'stops:changed', { stopId: stop.id })
    await respondItinerary(res, it.id, userId)
  })
)

/**
 * @route DELETE /api/itineraries/:id/stops/:stopId
 * @desc Remove a stop (editor+)
 * @access Private
 */
router.delete(
  '/:id/stops/:stopId',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.EDITOR)
    const deleted = await prisma.itineraryStop.deleteMany({
      where: { id: req.params.stopId, itineraryId: it.id },
    })
    if (deleted.count === 0) return res.status(404).json({ error: 'Stop not found' })
    await normalizePositions(it.id)
    await touchItinerary(it.id)
    broadcastItinerary(it.id, 'stops:changed')
    await respondItinerary(res, it.id, userId)
  })
)

/**
 * @route POST /api/itineraries/:id/stops/reorder
 * @desc Manually reorder stops (editor+). Body: { order: [stopId, ...] }
 * @access Private
 */
router.post(
  '/:id/stops/reorder',
  [body('order').isArray({ min: 1 })],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.EDITOR)

    const existing = await prisma.itineraryStop.findMany({
      where: { itineraryId: it.id },
      select: { id: true },
    })
    const validIds = new Set(existing.map((s) => s.id))
    const order = req.body.order.filter((id) => validIds.has(id))

    const updates = order.map((id, idx) =>
      prisma.itineraryStop.update({ where: { id }, data: { position: idx } })
    )
    if (updates.length) await prisma.$transaction(updates)
    await touchItinerary(it.id)
    broadcastItinerary(it.id, 'stops:reordered')
    await respondItinerary(res, it.id, userId)
  })
)

// ===========================================================================
// Votes
// ===========================================================================

/**
 * @route POST /api/itineraries/:id/stops/:stopId/vote
 * @desc Like (1), dislike (-1), or clear (0). Auto-reorders if autoSort is on.
 * @access Private (viewer+)
 */
router.post(
  '/:id/stops/:stopId/vote',
  [body('value').isInt({ min: -1, max: 1 })],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.VIEWER)

    const stop = await prisma.itineraryStop.findFirst({
      where: { id: req.params.stopId, itineraryId: it.id },
      select: { id: true },
    })
    if (!stop) return res.status(404).json({ error: 'Stop not found' })

    const value = parseInt(req.body.value, 10)
    if (value === 0) {
      await prisma.itineraryVote.deleteMany({ where: { stopId: stop.id, userId } })
    } else {
      await prisma.itineraryVote.upsert({
        where: { stopId_userId: { stopId: stop.id, userId } },
        create: { stopId: stop.id, userId, value },
        update: { value },
      })
    }

    if (it.autoSort) await reorderStopsByVotes(it.id)
    await touchItinerary(it.id)
    broadcastItinerary(it.id, 'votes:changed', { stopId: stop.id })
    await respondItinerary(res, it.id, userId)
  })
)

// ===========================================================================
// Comments
// ===========================================================================

/**
 * @route GET /api/itineraries/:id/stops/:stopId/comments
 * @access Private (viewer+)
 */
router.get(
  '/:id/stops/:stopId/comments',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.VIEWER)
    const comments = await prisma.itineraryComment.findMany({
      where: { stopId: req.params.stopId, stop: { itineraryId: it.id } },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ comments: comments.map(serializeComment) })
  })
)

/**
 * @route POST /api/itineraries/:id/stops/:stopId/comments
 * @desc Add a comment to a stop (viewer+)
 * @access Private
 */
router.post(
  '/:id/stops/:stopId/comments',
  [body('body').trim().isLength({ min: 1, max: 1000 })],
  handle(async (req, res) => {
    if (!validate(req, res)) return
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.VIEWER)

    const stop = await prisma.itineraryStop.findFirst({
      where: { id: req.params.stopId, itineraryId: it.id },
      select: { id: true, name: true },
    })
    if (!stop) return res.status(404).json({ error: 'Stop not found' })

    const comment = await prisma.itineraryComment.create({
      data: {
        stopId: stop.id,
        userId,
        userName: req.user.name || null,
        body: req.body.body.trim(),
      },
    })
    await touchItinerary(it.id)
    broadcastItinerary(it.id, 'comments:changed', { stopId: stop.id })
    notifyMembers(it, {
      type: ITINERARY_NOTIFICATION_TYPES.UPDATED,
      title: '💬 New comment',
      body: `${req.user.name || 'A member'} commented on "${stop.name}" in "${it.title}".`,
      data: { stopId: stop.id },
      exceptUserId: userId,
    })
    res.status(201).json({ comment: serializeComment(comment) })
  })
)

/**
 * @route DELETE /api/itineraries/:id/stops/:stopId/comments/:commentId
 * @desc Delete a comment (author or owner)
 * @access Private
 */
router.delete(
  '/:id/stops/:stopId/comments/:commentId',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    const role = memberRole(it, userId)
    if (!role) return res.status(403).json({ error: 'You are not a member of this itinerary' })

    const comment = await prisma.itineraryComment.findFirst({
      where: { id: req.params.commentId, stopId: req.params.stopId, stop: { itineraryId: it.id } },
    })
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    if (comment.userId !== userId && role !== ITINERARY_ROLES.OWNER) {
      return res.status(403).json({ error: 'You can only delete your own comments' })
    }
    await prisma.itineraryComment.delete({ where: { id: comment.id } })
    broadcastItinerary(it.id, 'comments:changed', { stopId: req.params.stopId })
    res.json({ success: true })
  })
)

// ===========================================================================
// Sharing / joining by link
// ===========================================================================

/**
 * @route GET /api/itineraries/share/:token
 * @desc Preview a shared itinerary before joining
 * @access Private
 */
router.get(
  '/share/:token',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await prisma.itinerary.findUnique({
      where: { shareToken: req.params.token },
      include: {
        owner: { select: { name: true } },
        members: { select: { userId: true } },
        _count: { select: { stops: true, members: true } },
      },
    })
    if (!it) return res.status(404).json({ error: 'Invite link is invalid or expired' })
    res.json({
      itinerary: {
        id: it.id,
        title: it.title,
        description: it.description || null,
        coverEmoji: it.coverEmoji || null,
        ownerName: it.owner?.name || null,
        stopCount: it._count.stops,
        memberCount: it._count.members,
        alreadyMember: it.ownerId === userId || it.members.some((m) => m.userId === userId),
      },
    })
  })
)

/**
 * @route POST /api/itineraries/share/:token/join
 * @desc Join a shared itinerary via its invite link
 * @access Private
 */
router.post(
  '/share/:token/join',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await prisma.itinerary.findUnique({
      where: { shareToken: req.params.token },
      include: { members: { select: { userId: true } } },
    })
    if (!it) return res.status(404).json({ error: 'Invite link is invalid or expired' })

    const alreadyMember = it.ownerId === userId || it.members.some((m) => m.userId === userId)
    if (!alreadyMember) {
      await prisma.itineraryMember.create({
        data: { itineraryId: it.id, userId, role: ROLE_FOR_LINK_JOIN },
      })
      broadcastItinerary(it.id, 'members:changed')
      // Notify the owner that someone joined.
      const full = await getItineraryForViewer(it.id, userId)
      notifyMembers(full, {
        type: ITINERARY_NOTIFICATION_TYPES.JOINED,
        title: '👥 Someone joined your trip',
        body: `${req.user.name || 'A traveller'} joined "${full.title}".`,
        exceptUserId: userId,
      })
    }
    await respondItinerary(res, it.id, userId)
  })
)

/**
 * @route POST /api/itineraries/:id/share/rotate
 * @desc Regenerate the invite link token (owner only)
 * @access Private
 */
router.post(
  '/:id/share/rotate',
  handle(async (req, res) => {
    const userId = req.user.id
    const it = await requireItinerary(req.params.id)
    assertRole(it, userId, ITINERARY_ROLES.OWNER)
    const updated = await prisma.itinerary.update({
      where: { id: it.id },
      data: { shareToken: newShareToken() },
    })
    res.json({ shareToken: updated.shareToken })
  })
)

export default router
