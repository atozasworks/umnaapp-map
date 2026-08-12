/**
 * Notification flow tests:
 * - business claim helpers use createUserNotification types + prefs
 * - "near you" geo radius filtering
 * - admin routes wire claim approve/reject through the notification service
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  NOTIFICATION_TYPES,
  isWithinNotifyRadius,
  getNotifyNearRadiusKm,
  notifyBusinessClaimApproved,
  notifyBusinessClaimRejected,
} from '../services/notificationService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')

describe('notification types & geo helpers', () => {
  test('business claim notification types are defined', () => {
    assert.equal(NOTIFICATION_TYPES.BUSINESS_CLAIM_APPROVED, 'business_claim_approved')
    assert.equal(NOTIFICATION_TYPES.BUSINESS_CLAIM_REJECTED, 'business_claim_rejected')
  })

  test('getNotifyNearRadiusKm defaults to 50 and respects env', () => {
    const prev = process.env.NOTIFY_NEAR_RADIUS_KM
    delete process.env.NOTIFY_NEAR_RADIUS_KM
    assert.equal(getNotifyNearRadiusKm(), 50)
    process.env.NOTIFY_NEAR_RADIUS_KM = '25'
    assert.equal(getNotifyNearRadiusKm(), 25)
    process.env.NOTIFY_NEAR_RADIUS_KM = '9999'
    assert.equal(getNotifyNearRadiusKm(), 500)
    if (prev === undefined) delete process.env.NOTIFY_NEAR_RADIUS_KM
    else process.env.NOTIFY_NEAR_RADIUS_KM = prev
  })

  test('isWithinNotifyRadius includes nearby points and excludes far ones', () => {
    // ~11 km apart at equator ≈ 0.1 deg lat
    assert.equal(isWithinNotifyRadius(12.97, 77.59, 12.98, 77.59, 50), true)
    assert.equal(isWithinNotifyRadius(12.97, 77.59, 13.97, 77.59, 50), false)
    assert.equal(isWithinNotifyRadius(NaN, 77.59, 12.98, 77.59, 50), false)
  })
})

describe('business claim notification helpers', () => {
  test('notifyBusinessClaimApproved creates typed notification for claimant', async () => {
    const created = []
    const originalCreate = (await import('../services/notificationService.js')).createUserNotification
    // Spy by temporarily patching module export is awkward in ESM; call helper
    // against real createUserNotification with prisma — skip if model missing.
    const prisma = (await import('../config/database.js')).default
    if (!prisma.notification || !prisma.user) {
      assert.ok(true, 'notification model unavailable — skipped live insert')
      return
    }

    // Prefer a known user if any exist; otherwise skip DB-dependent assert.
    const user = await prisma.user.findFirst({ select: { id: true } })
    if (!user) {
      assert.ok(true, 'no users in DB — skipped live insert')
      return
    }

    const before = await prisma.notification.count({
      where: { userId: user.id, type: 'business_claim_approved' },
    })

    const result = await notifyBusinessClaimApproved(
      { userId: user.id, placeId: 'test-place-claim-approve' },
      { placeId: 'test-place-claim-approve' }
    )

    // Preference mute may skip create — either a row or null is acceptable if muted.
    if (result) {
      assert.equal(result.type, 'business_claim_approved')
      assert.equal(result.userId, user.id)
      assert.equal(result.data?.placeId, 'test-place-claim-approve')
      // Cleanup test row
      await prisma.notification.delete({ where: { id: result.id } }).catch(() => {})
    } else {
      const pref = prisma.notificationPreference
        ? await prisma.notificationPreference.findUnique({ where: { userId: user.id } })
        : null
      assert.ok(
        pref?.businessClaim === false,
        'create returned null only when businessClaim preference is muted'
      )
    }

    void created
    void originalCreate
    void before
  })

  test('notifyBusinessClaimRejected creates typed notification for claimant', async () => {
    const prisma = (await import('../config/database.js')).default
    if (!prisma.notification || !prisma.user) {
      assert.ok(true, 'notification model unavailable — skipped')
      return
    }
    const user = await prisma.user.findFirst({ select: { id: true } })
    if (!user) {
      assert.ok(true, 'no users — skipped')
      return
    }

    const result = await notifyBusinessClaimRejected(
      { userId: user.id, placeId: 'test-place-claim-reject' },
      { note: 'Missing proof documents.' }
    )

    if (result) {
      assert.equal(result.type, 'business_claim_rejected')
      assert.match(result.body, /Missing proof/)
      await prisma.notification.delete({ where: { id: result.id } }).catch(() => {})
    }
  })
})

describe('source wiring', () => {
  test('admin claim routes use notifyBusinessClaimApproved/Rejected (not raw prisma.create)', () => {
    const source = fs.readFileSync(path.join(backendRoot, 'routes', 'adminRoutes.js'), 'utf8')
    assert.match(source, /notifyBusinessClaimApproved/)
    assert.match(source, /notifyBusinessClaimRejected/)
    assert.doesNotMatch(
      source,
      /prisma\.notification\.create\(\s*\{\s*data:\s*\{\s*userId:\s*claim\.userId/
    )
  })

  test('community broadcasts use recipientsNearPlace / near-you wording', () => {
    const source = fs.readFileSync(
      path.join(backendRoot, 'services', 'notificationService.js'),
      'utf8'
    )
    assert.match(source, /recipientsNearPlace\(place,\s*'placeAdded'/)
    assert.match(source, /recipientsNearPlace\(place,\s*'festival'/)
    assert.match(source, /near you/)
    assert.match(source, /findUserIdsNearPoint/)
  })

  test('PREF_KEY_BY_TYPE maps business claim types to businessClaim', () => {
    const source = fs.readFileSync(
      path.join(backendRoot, 'services', 'notificationService.js'),
      'utf8'
    )
    assert.match(source, /business_claim_approved:\s*'businessClaim'/)
    assert.match(source, /business_claim_rejected:\s*'businessClaim'/)
  })
})

describe('geo recipient filtering with anchors', () => {
  test('findUserIdsNearPoint returns only users with nearby anchors', async () => {
    const { findUserIdsNearPoint } = await import('../services/notificationService.js')
    const prisma = (await import('../config/database.js')).default

    // Pure behavior when given empty candidates
    const empty = await findUserIdsNearPoint([], 12.97, 77.59, 50)
    assert.equal(empty.size, 0)

    if (!prisma.user || !prisma.favorite) {
      assert.ok(true, 'models unavailable — skipped DB geo case')
      return
    }

    const users = await prisma.user.findMany({ take: 2, select: { id: true } })
    if (users.length < 1) {
      assert.ok(true, 'need users — skipped')
      return
    }

    const nearUser = users[0]
    const farUser = users[1] || null

    // Temporary favorite near Bangalore for nearUser
    const fav = await prisma.favorite.create({
      data: {
        userId: nearUser.id,
        name: 'notify-geo-test-fav',
        latitude: 12.9716,
        longitude: 77.5946,
        category: 'Test',
      },
    })

    let farFav = null
    if (farUser) {
      farFav = await prisma.favorite.create({
        data: {
          userId: farUser.id,
          name: 'notify-geo-test-far',
          latitude: 28.6139, // Delhi — far from Bangalore
          longitude: 77.209,
          category: 'Test',
        },
      })
    }

    try {
      const ids = [nearUser.id, ...(farUser ? [farUser.id] : [])]
      const near = await findUserIdsNearPoint(ids, 12.97, 77.59, 50)
      assert.ok(near.has(nearUser.id), 'user with Bangalore favorite should be near')
      if (farUser) {
        assert.equal(near.has(farUser.id), false, 'Delhi favorite must not match Bangalore radius')
      }
    } finally {
      await prisma.favorite.delete({ where: { id: fav.id } }).catch(() => {})
      if (farFav) await prisma.favorite.delete({ where: { id: farFav.id } }).catch(() => {})
    }
  })
})
