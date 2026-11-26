/**
 * Open-data auto-add: copies places from the OpenPlace catalogue (Overture,
 * Foursquare OS Places, CSV imports) onto the map without anyone picking them.
 *
 *   1. read catalogue rows in a bounding box that were not handled before
 *   2. rule-based duplicate check against places on the map and against each other
 *   3. AI decides only the ambiguous pairs
 *   4. quality threshold: high confidence → approved, the rest → admin review
 *   5. every decision is written back to the catalogue row, so a later run
 *      continues where this one stopped and never re-adds a place
 *
 * Run through scripts/auto-add-open-places.js.
 */
import axios from 'axios'
import prisma from '../config/database.js'
import { initialApprovalFields } from './placeApproval.js'
import { recordPlaceAudit, systemActor, PLACE_AUDIT_ACTIONS } from './placeAudit.js'
import { translateText, getLanguageFromAddress } from './translateService.js'
import { buildNormalizedAddressFields } from '../utils/osmAddress.js'
import { buildPlaceDetailFields, sanitizePlaceName } from '../utils/placePayload.js'
import { classifyPair, decideRoute } from '../utils/openPlaceMatch.js'
import { judgeDuplicatePairs, duplicateAiEnabled } from './placeDuplicateAi.js'
import { openPlacesAvailable } from './openPlaceQuery.js'

const DAY_MS = 24 * 60 * 60 * 1000
/** Zoom stored with an auto-added place: close enough that a single shop is visible. */
const PLACE_ZOOM = 17
/** ~330 m in degrees: neighbour search window (covers the 250 m match radius with room to spare). */
const NEIGHBOUR_DEG = 0.003
const ACTOR_NAME = 'Open-data auto-add'

/** Owner of auto-added places. `.invalid` can never receive mail. */
export const AUTO_ADD_USER_EMAIL = 'open-data-import@umnaapp.invalid'
const AUTO_ADD_USER_NAME = 'Open Data Import'

// Same tables the frontend uses when a person adds a place (frontend/src/utils/mapRenderingConfig.js).
const LANDMARK_CATEGORIES = new Set(['Tourist Place', 'Museum', 'Temple'])
const TRANSIT_CATEGORIES = new Set(['Bus Stop', 'Transit'])
const CATEGORY_PRIORITY = {
  Hospital: 110, 'Police Station': 108, Pharmacy: 102, School: 100, Bank: 96, 'Post Office': 94,
  'Bus Stop': 92, Transit: 92, Restaurant: 78, Hotel: 76, 'Tourist Place': 74, Museum: 72, Temple: 70,
  Cinema: 68, Gym: 66, Salon: 64, Shop: 62, 'Grocery Store': 62, Parking: 58, 'Petrol Pump': 56, ATM: 54,
  Other: 50,
}

/** Bookkeeping columns on the catalogue (idempotent; also in prisma/add-open-places.sql). */
export async function ensureAutoAddColumns() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "OpenPlace"
    ADD COLUMN IF NOT EXISTS place_id TEXT,
    ADD COLUMN IF NOT EXISTS auto_status TEXT,
    ADD COLUMN IF NOT EXISTS auto_note TEXT,
    ADD COLUMN IF NOT EXISTS auto_checked_at TIMESTAMPTZ`)
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "OpenPlace_auto_status_idx" ON "OpenPlace" (auto_status)'
  )
}

async function resolveOwner(email) {
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })
    if (!user) throw new Error(`No user with email ${email}`)
    return user
  }
  const existing = await prisma.user.findUnique({
    where: { email: AUTO_ADD_USER_EMAIL },
    select: { id: true, name: true, email: true },
  })
  if (existing) return existing
  return prisma.user.create({
    data: { name: AUTO_ADD_USER_NAME, email: AUTO_ADD_USER_EMAIL, dailyReminderOptOut: true, profilePublic: false },
    select: { id: true, name: true, email: true },
  })
}

// ---------------------------------------------------------------------------
// Address lookup (taluk / district / state / local language), cached per ~500 m cell
// ---------------------------------------------------------------------------

const REVERSE_URLS = [
  (process.env.REVERSE_URL || 'https://umnaapp.in/map/reverse').trim().replace(/\/+$/, ''),
  (process.env.NOMINATIM_URL || '').trim() ? `${process.env.NOMINATIM_URL.trim().replace(/\/+$/, '')}/reverse` : null,
].filter(Boolean)
const PUBLIC_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
const USER_AGENT = process.env.OSM_USER_AGENT || 'UMNAAPP-Map-Platform/1.0 (https://umnaapp.in; support@umnaapp.in)'

const areaCache = new Map()
let lastPublicCall = 0

async function reverseOnce(url, lat, lng) {
  try {
    const { data } = await axios.get(url, {
      params: { lat, lon: lng, format: 'json', addressdetails: 1 },
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      timeout: 7000,
    })
    return data && !data.error && data.address ? data : null
  } catch {
    return null
  }
}

async function lookupArea(lat, lng) {
  const key = `${Math.round(lat / 0.005)}:${Math.round(lng / 0.005)}`
  if (areaCache.has(key)) return areaCache.get(key)

  let result = null
  for (const url of REVERSE_URLS) {
    result = await reverseOnce(url, lat, lng)
    if (result) break
  }
  if (!result) {
    // Public OpenStreetMap geocoder allows one request per second.
    const wait = 1100 - (Date.now() - lastPublicCall)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastPublicCall = Date.now()
    result = await reverseOnce(PUBLIC_REVERSE_URL, lat, lng)
  }

  let area = { village: '', taluk: '', district: '', state: '', country: '', pincode: '', targetLang: null }
  if (result) {
    const fields = await buildNormalizedAddressFields(result.address || {}, result.display_name || '').catch(() => ({}))
    area = {
      village: fields?.village || '',
      taluk: fields?.taluk || '',
      district: fields?.district || '',
      state: fields?.state || '',
      country: fields?.country || '',
      pincode: fields?.pincode || '',
      targetLang: getLanguageFromAddress(result.address || {}) || null,
    }
  }
  areaCache.set(key, area)
  return area
}

// ---------------------------------------------------------------------------
// Row building
// ---------------------------------------------------------------------------

function pointViewport(lat, lng, zoom) {
  const halfLat = 180 / 2 ** zoom
  const halfLng = halfLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.2)
  return { north: lat + halfLat, south: lat - halfLat, east: lng + halfLng, west: lng - halfLng }
}

const uniqueJoin = (values, max) => {
  const out = []
  for (const value of values) {
    const v = String(value || '').trim()
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v)
  }
  return (max ? out.slice(0, max) : out).join(', ')
}

function typeSlug(text) {
  const last = String(text || '').split('>').pop()
  const slug = last.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return slug ? slug.slice(0, 100) : null
}

/**
 * Prisma `Place` create data for one catalogue row — the same parameter set a
 * place gets from the Place Extractor (zoom, viewport, type, vicinity, address…).
 */
export function buildAutoPlaceRow(open, { owner, area = {}, localName = null, approve, reviewDays = 30, now = new Date() }) {
  const parts = {
    village: area.village || open.locality || '',
    taluk: area.taluk || '',
    district: area.district || '',
    state: area.state || open.region || '',
    country: area.country || (open.country === 'IN' ? 'India' : ''),
    pincode: open.postcode || area.pincode || '',
  }
  const name = sanitizePlaceName(open.name, parts) || open.name.trim()
  const type = typeSlug(open.raw_category) || typeSlug(open.category)
  const viewport = pointViewport(open.latitude, open.longitude, PLACE_ZOOM)
  const priority = CATEGORY_PRIORITY[open.category] ?? CATEGORY_PRIORITY.Other
  const featureType = LANDMARK_CATEGORIES.has(open.category)
    ? 'landmark'
    : TRANSIT_CATEGORIES.has(open.category)
      ? 'transit'
      : 'poi'
  const composedAddress = uniqueJoin([
    parts.village,
    parts.taluk,
    parts.district,
    [parts.state, parts.pincode].filter(Boolean).join(' '),
    parts.country,
  ])

  const details = buildPlaceDetailFields({
    type,
    types: type ? [type] : undefined,
    address: open.full_address || composedAddress || undefined,
    vicinity: uniqueJoin([parts.village, parts.taluk, parts.district], 2) || undefined,
    ...parts,
    phone: open.phone || undefined,
    website: open.website || undefined,
    business_status: 'OPERATIONAL',
    extracted_at: now.toISOString(),
    zoomLevel: PLACE_ZOOM,
    mapRenderingConfig: {
      zoomLevel: PLACE_ZOOM,
      featureType,
      elementType: 'labels',
      bounds: viewport,
      viewport,
      lod: 3,
      priority,
      zIndex: 100 + priority,
      clustering: { enabled: false, radius: 48, maxZoom: 14, minPoints: 2 },
      decluttering: { enabled: true, minZoom: 11, priorityThreshold: 0.45, maxLabels: 200 },
      iconSizeScaling: { baseZoom: PLACE_ZOOM, min: 0.65, max: 1.25, factor: 0.08 },
      textSizeScaling: { baseZoom: PLACE_ZOOM, min: 0.8, max: 1.2, factor: 0.06 },
      simplification: 0.25,
      labelZoomStart: 11,
      labelZoomFull: 13.5,
      extractedAt: now.toISOString(),
    },
  })

  const approval = approve
    ? { approvalStatus: 'approved', approvedAt: now, autoApproveAt: null }
    : {
        ...initialApprovalFields(now, { kind: 'extracted' }),
        // Held for an admin: the usual 1-day auto-approval would defeat the review.
        autoApproveAt: new Date(now.getTime() + reviewDays * DAY_MS),
      }

  return {
    name,
    placeNameEn: name,
    // A catalogue name written only in local script is also the local name.
    placeNameLocal: localName || (/[a-z]{2}/i.test(name) ? null : name),
    category: open.category || 'Other',
    latitude: open.latitude,
    longitude: open.longitude,
    zoomLevel: PLACE_ZOOM,
    userId: owner.id,
    userName: owner.name,
    userEmail: owner.email,
    source: 'contribution',
    ...approval,
    ...details,
  }
}

// ---------------------------------------------------------------------------
// Duplicate search
// ---------------------------------------------------------------------------

/** Small grid index so each candidate is compared only with places within ~330 m. */
class NeighbourIndex {
  constructor() {
    this.cells = new Map()
  }
  key(lat, lng) {
    return `${Math.floor(lat / NEIGHBOUR_DEG)}:${Math.floor(lng / NEIGHBOUR_DEG)}`
  }
  add(entry) {
    const k = this.key(entry.lat, entry.lng)
    if (!this.cells.has(k)) this.cells.set(k, [])
    this.cells.get(k).push(entry)
  }
  near(lat, lng) {
    const out = []
    const cy = Math.floor(lat / NEIGHBOUR_DEG)
    const cx = Math.floor(lng / NEIGHBOUR_DEG)
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        const list = this.cells.get(`${y}:${x}`)
        if (list) out.push(...list)
      }
    }
    return out
  }
}

const openAddress = (o) => o.full_address || [o.locality, o.region].filter(Boolean).join(', ') || ''

/**
 * @param {object} options
 * @param {{minLat:number,maxLat:number,minLng:number,maxLng:number}} options.bbox
 * @param {number} [options.limit] catalogue rows handled in this run
 * @param {number} [options.approveConfidence] at or above → added as approved
 * @param {number} [options.minConfidence] below → left alone
 * @param {string[]} [options.categories] only these app categories
 * @param {string[]} [options.sources] only these catalogue sources
 * @param {string[]} [options.trustedSources] sources without a confidence score that may be approved directly
 * @param {boolean} [options.reviewOnly] never approve directly; everything goes to admin review
 * @param {number} [options.reviewDays] how long a held place waits for an admin before auto-approval
 * @param {boolean} [options.useAi] [options.geocode] [options.translate] [options.dryRun]
 * @param {string} [options.ownerEmail] existing user to own the places (default: a dedicated import user)
 * @param {(msg:string)=>void} [options.log]
 */
export async function runAutoAdd(options) {
  const {
    bbox,
    limit = 200,
    approveConfidence = 0.85,
    minConfidence = 0.5,
    categories = null,
    sources = null,
    trustedSources = [],
    reviewOnly = false,
    reviewDays = 30,
    useAi = true,
    geocode = true,
    translate = true,
    dryRun = false,
    ownerEmail = null,
    log = () => {},
  } = options

  if (!(await openPlacesAvailable())) {
    throw new Error('OpenPlace table is missing. Run: npm run migrate:open-places, then npm run import:open-places')
  }
  await ensureAutoAddColumns()

  // 1. Catalogue rows not handled yet --------------------------------------
  const params = [bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng, minConfidence]
  const where = [
    'latitude BETWEEN $1 AND $2',
    'longitude BETWEEN $3 AND $4',
    'auto_status IS NULL',
    '(confidence IS NULL OR confidence >= $5)',
  ]
  if (categories?.length) {
    params.push(categories)
    where.push(`category = ANY($${params.length}::text[])`)
  }
  if (sources?.length) {
    params.push(sources)
    where.push(`source = ANY($${params.length}::text[])`)
  }
  const [{ remaining }] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS remaining FROM "OpenPlace" WHERE ${where.join(' AND ')}`,
    ...params
  )
  params.push(limit)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, source, name, category, raw_category, latitude, longitude, full_address, locality,
            region, postcode, country, phone, website, confidence
     FROM "OpenPlace" WHERE ${where.join(' AND ')}
     ORDER BY confidence DESC NULLS LAST, id
     LIMIT $${params.length}`,
    ...params
  )
  const summary = {
    dryRun,
    aiEnabled: useAi && duplicateAiEnabled(),
    scanned: rows.length,
    remainingAfter: Math.max(remaining - rows.length, 0),
    approved: 0,
    review: 0,
    duplicates: 0,
    skipped: 0,
    aiPairs: 0,
    aiSame: 0,
    aiDifferent: 0,
    aiUnsure: 0,
    failed: 0,
    items: [],
  }
  if (!rows.length) return summary
  log(`${rows.length} catalogue place(s) to check (${summary.remainingAfter} more waiting after this run).`)

  // 2. Places already on the map around them --------------------------------
  const lats = rows.map((r) => r.latitude)
  const lngs = rows.map((r) => r.longitude)
  const existing = await prisma.place.findMany({
    where: {
      latitude: { gte: Math.min(...lats) - NEIGHBOUR_DEG, lte: Math.max(...lats) + NEIGHBOUR_DEG },
      longitude: { gte: Math.min(...lngs) - NEIGHBOUR_DEG, lte: Math.max(...lngs) + NEIGHBOUR_DEG },
    },
    select: {
      id: true, name: true, placeNameEn: true, category: true, latitude: true, longitude: true,
      fullAddress: true, vicinity: true,
    },
  })
  const index = new NeighbourIndex()
  for (const p of existing) {
    index.add({
      kind: 'place',
      id: p.id,
      name: p.placeNameEn || p.name,
      altName: p.placeNameEn && p.name !== p.placeNameEn ? p.name : null,
      category: p.category,
      address: p.fullAddress || p.vicinity || '',
      lat: p.latitude,
      lng: p.longitude,
    })
  }

  // 3. Rules first; ambiguous pairs are queued for the AI -------------------
  const items = rows.map((open) => ({ open, decision: null, reason: '', matchId: null, possible: null }))
  const aiQueue = []
  for (const item of items) {
    const { open } = item
    const route = decideRoute(open, { approveConfidence, minConfidence, trustedSources })
    if (route.action === 'skip') {
      item.decision = 'skipped'
      item.reason = route.reason
      continue
    }
    item.route = route

    const candidate = { name: open.name, category: open.category, lat: open.latitude, lng: open.longitude }
    let ambiguous = null
    for (const other of index.near(open.latitude, open.longitude)) {
      if (other.item && other.item.decision === 'duplicate') continue
      const match = classifyPair(candidate, other)
      if (match.verdict === 'same') {
        item.decision = 'duplicate'
        item.matchId = other.kind === 'place' ? other.id : null
        item.reason = `same as "${other.name}" (${Math.round(match.distance)} m, name match ${match.similarity.toFixed(2)})`
        break
      }
      if (match.verdict === 'ambiguous' && (!ambiguous || match.similarity > ambiguous.match.similarity)) {
        ambiguous = { other, match }
      }
    }
    if (item.decision !== 'duplicate' && ambiguous) {
      item.possible = ambiguous
      aiQueue.push(item)
    }
    // Later catalogue rows are also compared with this one (two sources, one shop).
    if (item.decision !== 'duplicate') {
      index.add({
        kind: 'open',
        item,
        id: open.id,
        name: open.name,
        category: open.category,
        address: openAddress(open),
        lat: open.latitude,
        lng: open.longitude,
      })
    }
  }

  // 4. AI settles the ambiguous pairs ---------------------------------------
  if (aiQueue.length) {
    summary.aiPairs = aiQueue.length
    let verdicts = new Array(aiQueue.length).fill('unsure')
    if (summary.aiEnabled) {
      log(`Asking AI about ${aiQueue.length} unclear pair(s)…`)
      verdicts = await judgeDuplicatePairs(
        aiQueue.map(({ open, possible }) => ({
          a: { name: open.name, category: open.category, address: openAddress(open) },
          b: { name: possible.other.name, category: possible.other.category, address: possible.other.address },
          distance: possible.match.distance,
        }))
      )
    }
    aiQueue.forEach((item, i) => {
      const { other, match } = item.possible
      const label = `"${other.name}" (${Math.round(match.distance)} m)`
      if (verdicts[i] === 'same') {
        summary.aiSame++
        // The other side was itself dropped as a duplicate → nothing left to duplicate.
        if (other.item && other.item.decision === 'duplicate') return
        item.decision = 'duplicate'
        item.matchId = other.kind === 'place' ? other.id : null
        item.reason = `AI: same as ${label}`
      } else if (verdicts[i] === 'different') {
        summary.aiDifferent++
        item.aiNote = `AI: different from ${label}`
      } else {
        summary.aiUnsure++
        item.route = { action: 'review', reason: `possible duplicate of ${label}` }
      }
    })
  }

  // 5. Write ----------------------------------------------------------------
  const owner = dryRun ? { id: 'dry-run', name: AUTO_ADD_USER_NAME, email: AUTO_ADD_USER_EMAIL } : await resolveOwner(ownerEmail)
  const mark = (open, status, note, placeId = null) =>
    prisma.$executeRawUnsafe(
      `UPDATE "OpenPlace" SET auto_status = $2, auto_note = $3, place_id = $4, auto_checked_at = now() WHERE id = $1`,
      open.id,
      status,
      String(note || '').slice(0, 500),
      placeId
    )

  let done = 0
  let translateOn = translate
  let translateMisses = 0
  for (const item of items) {
    const { open } = item
    try {
      if (item.decision === 'skipped') {
        summary.skipped++
        if (!dryRun) await mark(open, 'skipped', item.reason)
      } else if (item.decision === 'duplicate') {
        summary.duplicates++
        if (!dryRun) await mark(open, 'duplicate', item.reason, item.matchId)
      } else {
        const approve = item.route.action === 'approve' && !reviewOnly
        item.decision = approve ? 'approved' : 'review'
        item.reason = [item.route.reason, item.aiNote].filter(Boolean).join('; ')
        if (!dryRun) {
          const area = geocode ? await lookupArea(open.latitude, open.longitude) : {}
          let localName = null
          if (translateOn && area.targetLang && area.targetLang !== 'en' && /[a-z]{2}/i.test(open.name)) {
            // The transliteration service is shared and rate limited: go slowly, and stop asking
            // for this run once it keeps refusing (places are still added, just without a local name).
            await new Promise((r) => setTimeout(r, 600))
            const t = await translateText(open.name, area.targetLang).catch(() => '')
            if (t && t.trim().toLowerCase() !== open.name.trim().toLowerCase()) {
              localName = t.trim().slice(0, 200)
              translateMisses = 0
            } else if (++translateMisses >= 4) {
              translateOn = false
              log('  Local-language names are unavailable right now; continuing without them.')
            }
          }
          const place = await prisma.place.create({
            data: buildAutoPlaceRow(open, { owner, area, localName, approve, reviewDays }),
          })
          await recordPlaceAudit({
            placeId: place.id,
            action: PLACE_AUDIT_ACTIONS.CREATED,
            actor: systemActor(ACTOR_NAME),
            after: place,
            note: `Auto-added from open data: ${open.source} (${open.id}); ${approve ? 'approved' : 'held for review'} — ${item.reason}`.slice(0, 1000),
          })
          await mark(open, approve ? 'added' : 'review', item.reason, place.id)
        }
        summary[approve ? 'approved' : 'review']++
      }
    } catch (err) {
      summary.failed++
      item.decision = 'failed'
      item.reason = err.message.split('\n').pop().slice(0, 200)
    }
    summary.items.push({
      name: open.name,
      category: open.category,
      confidence: open.confidence,
      decision: item.decision,
      reason: item.reason,
    })
    if (++done % 25 === 0) log(`  ${done}/${items.length} done`)
  }
  return summary
}
