import express from 'express'
import { body, query, validationResult } from 'express-validator'
import prisma from '../config/database.js'
import { adminAuth } from '../middleware/adminAuth.js'
import {
  autoApproveExpiredPendingPlaces,
  enrichPlaceApprovalMeta,
  getAutoApproveDays,
  pendingAutoApproveAt,
} from '../services/placeApproval.js'
import { buildPlaceDetailFields, serializePlace, PLACE_DETAIL_SELECT } from '../utils/placePayload.js'
import { onPlaceApproved } from '../services/notificationService.js'

const router = express.Router()
router.use(adminAuth)

/** Prisma client key -> display name */
export const MODEL_META = [
  { key: 'user', label: 'User' },
  { key: 'oTPVerification', label: 'OTPVerification' },
  { key: 'session', label: 'Session' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'location', label: 'Location' },
  { key: 'route', label: 'Route' },
  { key: 'place', label: 'Place' },
  { key: 'placeReview', label: 'PlaceReview' },
  { key: 'placePhoto', label: 'PlacePhoto' },
]

const KEY_BY_LABEL = Object.fromEntries(MODEL_META.map((m) => [m.label, m.key]))
const LABEL_BY_KEY = Object.fromEntries(MODEL_META.map((m) => [m.key, m.label]))

function getDelegate(modelParam) {
  const key = KEY_BY_LABEL[modelParam] || modelParam
  const delegate = prisma[key]
  if (!delegate || typeof delegate.findMany !== 'function') return null
  return { key, delegate }
}

/** Truncate huge string fields in list view unless ?full=1 */
function truncateRecord(obj, modelKey, full) {
  if (full) return obj
  const out = { ...obj }
  if (modelKey === 'placePhoto' && typeof out.dataUrl === 'string' && out.dataUrl.length > 120) {
    out.dataUrl = `${out.dataUrl.slice(0, 120)}… (${out.dataUrl.length} chars — add ?full=1 for full value)`
  }
  if (modelKey === 'user' && typeof out.picture === 'string' && out.picture.length > 120) {
    out.picture = `${out.picture.slice(0, 120)}… (${out.picture.length} chars — add ?full=1)`
  }
  return out
}

/** GET /api/admin/models */
router.get('/models', (req, res) => {
  res.json({ models: MODEL_META })
})

/** GET /api/admin/places/pending — places awaiting approval (search & filters) */
router.get('/places/pending', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    await autoApproveExpiredPendingPlaces()
    const where = buildApprovalPlacesWhere('pending', req.query)
    const baseWhere = { approvalStatus: 'pending' }
    const [rows, count, total, categories] = await prisma.$transaction([
      prisma.place.findMany({
        where,
        orderBy: [{ autoApproveAt: 'asc' }, { createdAt: 'asc' }],
        take: 500,
        select: PLACE_DETAIL_SELECT,
      }),
      prisma.place.count({ where }),
      prisma.place.count({ where: baseWhere }),
      prisma.place.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: { category: true },
        orderBy: { category: 'asc' },
      }),
    ])
    const places = rows.map((p) => {
      const s = enrichPlaceApprovalMeta(serializePlace(p))
      return { ...s, displayName: s.name }
    })
    res.json({
      places,
      count,
      total,
      categories: categories.map((c) => ({ category: c.category, count: c._count.category })),
      autoApproveDays: getAutoApproveDays(),
    })
  } catch (e) {
    console.error('admin places/pending', e)
    res.status(500).json({ error: e.message })
  }
})

/** GET /api/admin/places/approved — recently approved places (search & filters) */
router.get('/places/approved', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    await autoApproveExpiredPendingPlaces()
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100))
    const where = buildApprovalPlacesWhere('approved', req.query)
    const baseWhere = { approvalStatus: 'approved' }
    const [rows, count, total, categories] = await prisma.$transaction([
      prisma.place.findMany({
        where,
        orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        select: PLACE_DETAIL_SELECT,
      }),
      prisma.place.count({ where }),
      prisma.place.count({ where: baseWhere }),
      prisma.place.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: { category: true },
        orderBy: { category: 'asc' },
      }),
    ])
    const places = rows.map((p) => {
      const s = enrichPlaceApprovalMeta(serializePlace(p))
      return { ...s, displayName: s.name }
    })
    res.json({
      places,
      count,
      total,
      categories: categories.map((c) => ({ category: c.category, count: c._count.category })),
      autoApproveDays: getAutoApproveDays(),
    })
  } catch (e) {
    console.error('admin places/approved', e)
    res.status(500).json({ error: e.message })
  }
})

/** Search places by name / address / contributor (admin lists). */
function placeNameSearchWhere(q) {
  const term = String(q || '').trim()
  if (!term) return {}
  const or = [
    { name: { contains: term, mode: 'insensitive' } },
    { placeNameEn: { contains: term, mode: 'insensitive' } },
    { placeNameLocal: { contains: term, mode: 'insensitive' } },
    { fullAddress: { contains: term, mode: 'insensitive' } },
    { village: { contains: term, mode: 'insensitive' } },
    { taluk: { contains: term, mode: 'insensitive' } },
    { district: { contains: term, mode: 'insensitive' } },
    { state: { contains: term, mode: 'insensitive' } },
    { pincode: { contains: term, mode: 'insensitive' } },
    { googlePlaceId: { contains: term, mode: 'insensitive' } },
    { userName: { contains: term, mode: 'insensitive' } },
    { userEmail: { contains: term, mode: 'insensitive' } },
    { category: { contains: term, mode: 'insensitive' } },
  ]
  if (/^[0-9a-f-]{8,}$/i.test(term)) {
    or.push({ id: { contains: term, mode: 'insensitive' } })
  }
  return { OR: or }
}

function buildApprovalPlacesWhere(approvalStatus, queryParams = {}) {
  const where = { approvalStatus }
  const q = String(queryParams.q || '').trim()
  const category = String(queryParams.category || '').trim()
  const source = String(queryParams.source || '').trim()
  if (q) Object.assign(where, placeNameSearchWhere(q))
  if (category) where.category = { equals: category, mode: 'insensitive' }
  if (source) where.source = source
  return where
}

function buildPlacesWhere(queryParams) {
  const q = String(queryParams.q || '').trim()
  const status = String(queryParams.status || '').trim()
  const category = String(queryParams.category || '').trim()
  const source = String(queryParams.source || '').trim()
  const hasGoogle = queryParams.hasGoogle

  const where = {}
  if (status) where.approvalStatus = status
  if (category) where.category = { equals: category, mode: 'insensitive' }
  if (source) where.source = source
  if (hasGoogle === '1' || hasGoogle === 'true') {
    where.googlePlaceId = { not: null }
  }
  if (q) Object.assign(where, placeNameSearchWhere(q))
  return where
}

/** GET /api/admin/places — paginated extracted places with search & filters */
router.get(
  '/places',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('status').optional().isIn(['pending', 'approved', 'rejected']),
    query('source').optional().isIn(['contribution', 'saved']),
  ],
  async (req, res) => {
    try {
      if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      await autoApproveExpiredPendingPlaces()
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50))
      const skip = (page - 1) * limit
      const where = buildPlacesWhere(req.query)

      const [total, rows, categories] = await prisma.$transaction([
        prisma.place.count({ where }),
        prisma.place.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ extractedAt: 'desc' }, { createdAt: 'desc' }],
          select: PLACE_DETAIL_SELECT,
        }),
        prisma.place.groupBy({
          by: ['category'],
          _count: { category: true },
          orderBy: { category: 'asc' },
        }),
      ])

      res.json({
        places: rows.map(serializePlace),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        categories: categories.map((c) => ({ category: c.category, count: c._count.category })),
        autoApproveDays: getAutoApproveDays(),
      })
    } catch (e) {
      console.error('admin places list', e)
      res.status(500).json({ error: e.message })
    }
  }
)

/** GET /api/admin/places/:id — full place detail */
router.get('/places/:id', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    const id = String(req.params.id || '').trim()
    const place = await prisma.place.findUnique({
      where: { id },
      select: {
        ...PLACE_DETAIL_SELECT,
        photos: { select: { id: true, caption: true, createdAt: true, dataUrl: true }, take: 20 },
      },
    })
    if (!place) return res.status(404).json({ error: 'Place not found' })
    const out = serializePlace(place)
    out.photos = (place.photos || []).map((ph) => ({
      id: ph.id,
      caption: ph.caption,
      createdAt: ph.createdAt,
      dataUrl:
        typeof ph.dataUrl === 'string' && ph.dataUrl.length > 200
          ? `${ph.dataUrl.slice(0, 200)}…`
          : ph.dataUrl,
    }))
    Object.assign(out, enrichPlaceApprovalMeta(place))
    res.json({ place: out })
  } catch (e) {
    console.error('admin place detail', e)
    res.status(500).json({ error: e.message })
  }
})

/** PATCH /api/admin/places/:id — edit place fields */
router.patch(
  '/places/:id',
  [
    body('place_name_en').optional().trim().isLength({ min: 1, max: 200 }),
    body('category').optional().trim().isLength({ min: 1, max: 50 }),
    body('approvalStatus').optional().isIn(['pending', 'approved', 'rejected']),
  ],
  async (req, res) => {
    try {
      if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const id = String(req.params.id || '').trim()
      const existing = await prisma.place.findUnique({ where: { id } })
      if (!existing) return res.status(404).json({ error: 'Place not found' })

      const data = {}
      if (req.body.place_name_en) {
        data.placeNameEn = req.body.place_name_en.trim()
        data.name = data.placeNameEn
      }
      if (req.body.place_name_local !== undefined) {
        data.placeNameLocal = req.body.place_name_local?.trim() || null
      }
      if (req.body.category) data.category = req.body.category.trim()
      if (req.body.latitude != null) data.latitude = parseFloat(req.body.latitude)
      if (req.body.longitude != null) data.longitude = parseFloat(req.body.longitude)
      if (req.body.zoomLevel != null) data.zoomLevel = parseFloat(req.body.zoomLevel)

      const detailPatch = buildPlaceDetailFields(req.body, {}, { forUpdate: true })
      Object.assign(data, detailPatch)

      if (req.body.approvalStatus) {
        data.approvalStatus = req.body.approvalStatus
        if (req.body.approvalStatus === 'approved') {
          data.approvedAt = new Date()
          data.autoApproveAt = null
        }
        if (req.body.approvalStatus === 'pending') {
          data.approvedAt = null
          if (!existing.autoApproveAt) data.autoApproveAt = pendingAutoApproveAt(new Date())
        }
        if (req.body.approvalStatus === 'rejected') {
          data.approvedAt = null
          data.autoApproveAt = null
        }
      }

      const place = await prisma.place.update({ where: { id }, data })
      if (req.body.approvalStatus === 'approved' && existing.approvalStatus !== 'approved') {
        onPlaceApproved(place, { approvedBy: 'admin' }).catch((err) => {
          console.error('[notify] onPlaceApproved bg error:', err)
        })
      }
      res.json({ place: serializePlace(place) })
    } catch (e) {
      console.error('admin place patch', e)
      res.status(500).json({ error: e.message })
    }
  }
)

/** DELETE /api/admin/places/:id */
router.delete('/places/:id', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    const id = String(req.params.id || '').trim()
    await prisma.place.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Place not found' })
    console.error('admin place delete', e)
    res.status(500).json({ error: e.message })
  }
})

/** PATCH /api/admin/places/:id/reject */
router.patch('/places/:id/reject', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    const id = String(req.params.id || '').trim()
    const result = await prisma.place.updateMany({
      where: { id, approvalStatus: 'pending' },
      data: { approvalStatus: 'rejected', approvedAt: null },
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Pending place not found' })
    }
    const place = await prisma.place.findUnique({ where: { id } })
    res.json({ success: true, place: serializePlace(place) })
  } catch (e) {
    console.error('admin place reject', e)
    res.status(500).json({ error: e.message })
  }
})

/** POST /api/admin/places/bulk-action — approve | reject | delete */
router.post(
  '/places/bulk-action',
  [
    body('ids').isArray({ min: 1, max: 500 }),
    body('action').isIn(['approve', 'reject', 'delete']),
  ],
  async (req, res) => {
    try {
      if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

      const { ids, action } = req.body
      const uniqueIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))]

      if (action === 'delete') {
        const result = await prisma.place.deleteMany({ where: { id: { in: uniqueIds } } })
        return res.json({ success: true, affected: result.count })
      }

      if (action === 'approve') {
        const pending = await prisma.place.findMany({
          where: { id: { in: uniqueIds }, approvalStatus: { not: 'approved' } },
          select: PLACE_DETAIL_SELECT,
        })
        const result = await prisma.place.updateMany({
          where: { id: { in: uniqueIds } },
          data: { approvalStatus: 'approved', approvedAt: new Date(), autoApproveAt: null },
        })
        for (const p of pending) {
          onPlaceApproved({ ...p, approvalStatus: 'approved' }, { approvedBy: 'admin' }).catch((err) => {
            console.error('[notify] bulk onPlaceApproved bg error:', err)
          })
        }
        return res.json({ success: true, affected: result.count })
      }

      const result = await prisma.place.updateMany({
        where: { id: { in: uniqueIds } },
        data: { approvalStatus: 'rejected', approvedAt: null },
      })
      res.json({ success: true, affected: result.count })
    } catch (e) {
      console.error('admin places bulk', e)
      res.status(500).json({ error: e.message })
    }
  }
)

/** PATCH /api/admin/places/:id/approve — approve a pending contribution immediately */
router.patch('/places/:id/approve', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    await autoApproveExpiredPendingPlaces()
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).json({ error: 'Place id required' })
    const result = await prisma.place.updateMany({
      where: { id, approvalStatus: 'pending' },
      data: { approvalStatus: 'approved', approvedAt: new Date(), autoApproveAt: null },
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Pending place not found or already approved' })
    }
    const place = await prisma.place.findUnique({ where: { id }, select: PLACE_DETAIL_SELECT })
    if (place) {
      onPlaceApproved(place, { approvedBy: 'admin' }).catch((err) => {
        console.error('[notify] onPlaceApproved bg error:', err)
      })
    }
    res.json({ success: true, place: serializePlace(place) })
  } catch (e) {
    console.error('admin places approve', e)
    res.status(500).json({ error: e.message })
  }
})

/** GET /api/admin/overview — row counts per table */
router.get('/overview', async (req, res) => {
  const counts = {}
  const errors = {}
  for (const { key, label } of MODEL_META) {
    try {
      counts[label] = await prisma[key].count()
    } catch (e) {
      console.warn(`admin overview count failed for ${label}:`, e.message)
      counts[label] = null
      errors[label] = e.message
    }
  }
  res.json({ counts, errors, generatedAt: new Date().toISOString() })
})

const GROWTH_MONTHS = 8

/** GET /api/admin/overview/growth — last N months: new Users vs new Places (createdAt) */
router.get('/overview/growth', async (req, res) => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (GROWTH_MONTHS - 1), 1)
  start.setHours(0, 0, 0, 0)

  const rows = []
  for (let i = GROWTH_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'short' })
    rows.push({ monthKey: key, month: label, Users: 0, Places: 0 })
  }

  const errors = {}

  try {
    const userAgg = await prisma.$queryRaw`
      SELECT to_char("createdAt", 'YYYY-MM') AS ym, COUNT(*)::int AS c
      FROM "User"
      WHERE "createdAt" >= ${start}
      GROUP BY 1
    `
    const byYm = Object.fromEntries(userAgg.map((r) => [String(r.ym).trim(), Number(r.c)]))
    for (const r of rows) {
      r.Users = byYm[r.monthKey] ?? 0
    }
  } catch (e) {
    console.warn('admin overview/growth User:', e.message)
    errors.User = e.message
  }

  try {
    const placeAgg = await prisma.$queryRaw`
      SELECT to_char("createdAt", 'YYYY-MM') AS ym, COUNT(*)::int AS c
      FROM "Place"
      WHERE "createdAt" >= ${start}
      GROUP BY 1
    `
    const byYm = Object.fromEntries(placeAgg.map((r) => [String(r.ym).trim(), Number(r.c)]))
    for (const r of rows) {
      r.Places = byYm[r.monthKey] ?? 0
    }
  } catch (e) {
    console.warn('admin overview/growth Place:', e.message)
    errors.Place = e.message
  }

  res.json({
    rows,
    months: GROWTH_MONTHS,
    generatedAt: new Date().toISOString(),
    errors: Object.keys(errors).length ? errors : undefined,
  })
})

/** GET /api/admin/schema — PostgreSQL information_schema (public) */
router.get('/schema', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        c.table_name AS "tableName",
        c.column_name AS "columnName",
        c.ordinal_position AS "ordinalPosition",
        c.data_type AS "dataType",
        c.udt_name AS "udtName",
        c.character_maximum_length AS "charMaxLength",
        c.numeric_precision AS "numericPrecision",
        c.is_nullable AS "isNullable",
        c.column_default AS "columnDefault"
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `
    const byTable = {}
    for (const r of rows) {
      const t = r.tableName
      if (!byTable[t]) byTable[t] = []
      byTable[t].push(r)
    }
    res.json({ tables: byTable, columns: rows })
  } catch (e) {
    console.error('admin schema', e)
    res.status(500).json({ error: e.message })
  }
})

/** GET /api/admin/schema/constraints — PKs and FKs */
router.get('/schema/constraints', async (req, res) => {
  try {
    const pk = await prisma.$queryRaw`
      SELECT
        tc.table_name AS "tableName",
        kcu.column_name AS "columnName",
        tc.constraint_type AS "constraintType"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      ORDER BY tc.table_name, kcu.ordinal_position
    `
    const fk = await prisma.$queryRaw`
      SELECT
        tc.table_name AS "fromTable",
        kcu.column_name AS "fromColumn",
        ccu.table_name AS "toTable",
        ccu.column_name AS "toColumn",
        tc.constraint_name AS "constraintName"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `
    res.json({ primaryKeysAndUnique: pk, foreignKeys: fk })
  } catch (e) {
    console.error('admin schema constraints', e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/admin/records/:model
 * model = Prisma key (user, oTPVerification, …) or label (User, OTPVerification, …)
 */
router.get('/records/:model', async (req, res) => {
  const decoded = decodeURIComponent(req.params.model)
  const found = getDelegate(decoded)
  if (!found) {
    return res.status(404).json({ error: 'Unknown model' })
  }
  const { key, delegate } = found
  const label = LABEL_BY_KEY[key]
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50))
  const skip = (page - 1) * limit
  const full = req.query.full === '1' || req.query.full === 'true'
  const q = String(req.query.q || '').trim()
  const where = key === 'place' && q ? placeNameSearchWhere(q) : {}

  try {
    const [total, rows] = await prisma.$transaction([
      delegate.count({ where }),
      delegate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
    ])

    const data = rows.map((r) => truncateRecord(r, key, full))

    res.json({
      model: label,
      modelKey: key,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      orderBy: { id: 'desc' },
      searchQuery: key === 'place' ? q : undefined,
      data,
    })
  } catch (e) {
    console.error('admin records', e)
    const missing = e.code === 'P2021' || /does not exist/i.test(e.message || '')
    res.status(missing ? 404 : 500).json({
      error: e.message,
      hint: missing
        ? 'Run SQL prisma/add-location-table.sql or from backend: npx prisma db push'
        : undefined,
    })
  }
})

export default router
