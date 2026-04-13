import express from 'express'
import prisma from '../config/database.js'
import { adminAuth } from '../middleware/adminAuth.js'
import {
  autoApproveExpiredPendingPlaces,
  pendingAutoApproveAt,
  getAutoApproveDays,
} from '../services/placeApproval.js'

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

/** GET /api/admin/places/pending — contributions awaiting approval (auto-approve runs first) */
router.get('/places/pending', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    await autoApproveExpiredPendingPlaces()
    const rows = await prisma.place.findMany({
      where: { approvalStatus: 'pending', source: 'contribution' },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: {
        id: true,
        name: true,
        placeNameEn: true,
        placeNameLocal: true,
        category: true,
        latitude: true,
        longitude: true,
        userId: true,
        userName: true,
        userEmail: true,
        source: true,
        createdAt: true,
        approvalStatus: true,
        approvedAt: true,
      },
    })
    const autoApproveDays = getAutoApproveDays()
    const places = rows.map((p) => ({
      ...p,
      displayName: p.placeNameEn ?? p.name,
      autoApproveAt: pendingAutoApproveAt(p.createdAt).toISOString(),
    }))
    res.json({ places, count: places.length, autoApproveDays })
  } catch (e) {
    console.error('admin places/pending', e)
    res.status(500).json({ error: e.message })
  }
})

/** PATCH /api/admin/places/:id/approve — approve a pending contribution immediately */
router.patch('/places/:id/approve', async (req, res) => {
  try {
    if (!prisma.place) return res.status(503).json({ error: 'Place model unavailable' })
    await autoApproveExpiredPendingPlaces()
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).json({ error: 'Place id required' })
    const result = await prisma.place.updateMany({
      where: { id, approvalStatus: 'pending' },
      data: { approvalStatus: 'approved', approvedAt: new Date() },
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Pending place not found or already approved' })
    }
    const place = await prisma.place.findUnique({ where: { id } })
    res.json({ success: true, place })
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

  try {
    const [total, rows] = await prisma.$transaction([
      delegate.count(),
      delegate.findMany({
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
      totalPages: Math.ceil(total / limit),
      orderBy: { id: 'desc' },
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
