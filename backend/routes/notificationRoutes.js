import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import prisma from '../config/database.js'
import {
  getVapidPublicKey,
  serializeNotification,
  createUserNotification,
} from '../services/notificationService.js'

const router = express.Router()

router.use(authenticateToken)

function modelUnavailable(res) {
  return res.status(503).json({
    error: 'Notifications unavailable',
    message: 'Run: cd backend && npx prisma generate && apply add-notifications.sql',
  })
}

/** GET /api/notifications */
router.get(
  '/',
  [query('limit').optional().isInt({ min: 1, max: 100 }), query('cursor').optional().isString()],
  async (req, res) => {
    try {
      if (!prisma.notification) return modelUnavailable(res)
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const limit = parseInt(req.query.limit, 10) || 30
      const cursor = req.query.cursor?.trim()

      const items = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      })

      let nextCursor = null
      if (items.length > limit) {
        const extra = items.pop()
        nextCursor = extra.id
      }

      const unreadCount = await prisma.notification.count({
        where: { userId: req.user.id, read: false },
      })

      res.json({
        notifications: items.map(serializeNotification),
        unreadCount,
        nextCursor,
      })
    } catch (e) {
      console.error('notifications list', e)
      res.status(500).json({ error: e.message })
    }
  }
)

/** GET /api/notifications/unread-count */
router.get('/unread-count', async (req, res) => {
  try {
    if (!prisma.notification) return modelUnavailable(res)
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    })
    res.json({ count })
  } catch (e) {
    console.error('notifications unread-count', e)
    res.status(500).json({ error: e.message })
  }
})

/** PATCH /api/notifications/:id/read */
router.patch('/:id/read', async (req, res) => {
  try {
    if (!prisma.notification) return modelUnavailable(res)
    const id = String(req.params.id || '').trim()
    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { read: true },
    })
    if (result.count === 0) return res.status(404).json({ error: 'Notification not found' })
    const notification = await prisma.notification.findUnique({ where: { id } })
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    })
    res.json({ notification: serializeNotification(notification), unreadCount })
  } catch (e) {
    console.error('notification mark read', e)
    res.status(500).json({ error: e.message })
  }
})

/** POST /api/notifications/read-all */
router.post('/read-all', async (req, res) => {
  try {
    if (!prisma.notification) return modelUnavailable(res)
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    })
    res.json({ success: true, affected: result.count, unreadCount: 0 })
  } catch (e) {
    console.error('notifications read-all', e)
    res.status(500).json({ error: e.message })
  }
})

/** GET /api/notifications/push/vapid-public-key */
router.get('/push/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey()
  res.json({ publicKey, enabled: Boolean(publicKey) })
})

/** POST /api/notifications/push/subscribe */
router.post(
  '/push/subscribe',
  [
    body('endpoint').isString().isLength({ min: 10 }),
    body('keys.p256dh').isString().isLength({ min: 10 }),
    body('keys.auth').isString().isLength({ min: 10 }),
  ],
  async (req, res) => {
    try {
      if (!prisma.pushSubscription) return modelUnavailable(res)
      if (!getVapidPublicKey()) {
        return res.status(503).json({ error: 'Push notifications are not configured on the server' })
      }
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const { endpoint, keys } = req.body
      const userAgent = req.headers['user-agent']?.slice(0, 500) || null

      const sub = await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId: req.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
        },
        update: {
          userId: req.user.id,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
        },
      })

      res.status(201).json({ success: true, id: sub.id })
    } catch (e) {
      console.error('push subscribe', e)
      res.status(500).json({ error: e.message })
    }
  }
)

/** POST /api/notifications/push/test — send a test push to yourself */
router.post('/push/test', async (req, res) => {
  try {
    if (!prisma.notification) return modelUnavailable(res)
    if (!getVapidPublicKey()) {
      return res.status(503).json({ error: 'Push notifications are not configured on the server' })
    }
    const subs = prisma.pushSubscription
      ? await prisma.pushSubscription.count({ where: { userId: req.user.id } })
      : 0
    await createUserNotification({
      userId: req.user.id,
      type: 'place_added',
      title: 'Test notification',
      body: 'If you see this, push notifications are working correctly.',
      data: { url: '/home' },
    })
    res.json({ success: true, subscriptions: subs })
  } catch (e) {
    console.error('push test', e)
    res.status(500).json({ error: e.message })
  }
})

/** DELETE /api/notifications/push/unsubscribe */
router.delete(
  '/push/unsubscribe',
  [body('endpoint').optional().isString()],
  async (req, res) => {
    try {
      if (!prisma.pushSubscription) return modelUnavailable(res)
      const endpoint = req.body?.endpoint?.trim()
      if (endpoint) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint, userId: req.user.id },
        })
      } else {
        await prisma.pushSubscription.deleteMany({ where: { userId: req.user.id } })
      }
      res.json({ success: true })
    } catch (e) {
      console.error('push unsubscribe', e)
      res.status(500).json({ error: e.message })
    }
  }
)

export default router
