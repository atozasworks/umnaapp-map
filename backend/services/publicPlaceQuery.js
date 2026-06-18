/**
 * Public Map Platform data layer.
 *
 * Every query here returns ONLY approved places from the same `Place` table the
 * authenticated app uses (no duplicate database), and every row is run through
 * `serializePublicPlace()` so private columns (contributor user id / email,
 * business-claim ownership, internal approval bookkeeping, audit data) are never
 * exposed to anonymous/embedded consumers.
 *
 * These functions are intentionally decoupled from request auth — they take a
 * plain options object so they can be reused by REST routes, the SDK, and any
 * future server-rendered embed.
 */

import prisma from '../config/database.js'
import { haversineMeters } from '../utils/geo.js'
import { resolvePlaceCategory } from '../utils/googlePlaceCategory.js'
import { festivalStatus, isFestivalPlace } from '../utils/festival.js'

/** Only approved places are ever public. */
const PUBLIC_WHERE = { approvalStatus: 'approved' }

/** Columns that are safe to expose to anonymous / external consumers. */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  placeNameEn: true,
  placeNameLocal: true,
  category: true,
  latitude: true,
  longitude: true,
  zoomLevel: true,
  source: true,
  googleType: true,
  googleTypes: true,
  vicinity: true,
  fullAddress: true,
  village: true,
  taluk: true,
  district: true,
  state: true,
  country: true,
  pincode: true,
  phone: true,
  website: true,
  description: true,
  rating: true,
  reviewCount: true,
  openingHours: true,
  businessStatus: true,
  googlePhotos: true,
  mapRenderingConfig: true,
  festivalStartDate: true,
  festivalEndDate: true,
  festivalRecurrence: true,
  createdAt: true,
  updatedAt: true,
}

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 200

function clampLimit(value, fallback = DEFAULT_LIMIT) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(1, n), MAX_LIMIT)
}

function clampOffset(value) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

/**
 * Convert a Place row to the public API shape. Strips every private field and
 * normalizes naming to snake_case + camelCase aliases used by the SDK/viewer.
 */
export function serializePublicPlace(p) {
  if (!p) return null
  const name = p.placeNameEn ?? p.name ?? 'Unnamed place'
  const category = resolvePlaceCategory({
    category: p.category,
    type: p.googleType,
    types: p.googleTypes,
    googleTypes: p.googleTypes,
    googleType: p.googleType,
    name,
  })
  const photos = Array.isArray(p.googlePhotos) ? p.googlePhotos : []
  return {
    id: p.id,
    name,
    place_name_en: name,
    place_name_local: p.placeNameLocal ?? null,
    category,
    latitude: p.latitude,
    longitude: p.longitude,
    zoomLevel: p.zoomLevel ?? 15,
    vicinity: p.vicinity ?? null,
    full_address: p.fullAddress ?? null,
    village: p.village ?? null,
    taluk: p.taluk ?? null,
    district: p.district ?? null,
    state: p.state ?? null,
    country: p.country ?? null,
    pincode: p.pincode ?? null,
    phone: p.phone ?? null,
    website: p.website ?? null,
    description: p.description ?? null,
    rating: p.rating ?? null,
    review_count: p.reviewCount ?? null,
    opening_hours: p.openingHours ?? null,
    business_status: p.businessStatus ?? null,
    photos: photos.map((ph) => (typeof ph === 'string' ? { url: ph } : ph)),
    map_rendering_config: p.mapRenderingConfig ?? null,
    festival: isFestivalPlace(p) ? festivalStatus(p) : null,
    created_at: p.createdAt ?? null,
    updated_at: p.updatedAt ?? null,
  }
}

/**
 * Paginated list of approved places with optional bbox + category filters.
 * Returns `{ places, total, limit, offset }`.
 */
export async function listPublicPlaces({
  categories = [],
  minLat,
  maxLat,
  minLng,
  maxLng,
  q,
  limit,
  offset,
} = {}) {
  if (!prisma.place) return { places: [], total: 0, limit: DEFAULT_LIMIT, offset: 0 }

  const take = clampLimit(limit)
  const skip = clampOffset(offset)

  const and = [PUBLIC_WHERE]
  if (Array.isArray(categories) && categories.length > 0) {
    and.push({ category: { in: categories } })
  }
  if (minLat != null && maxLat != null && Number.isFinite(minLat) && Number.isFinite(maxLat)) {
    and.push({ latitude: { gte: minLat, lte: maxLat } })
  }
  if (minLng != null && maxLng != null && Number.isFinite(minLng) && Number.isFinite(maxLng)) {
    and.push({ longitude: { gte: minLng, lte: maxLng } })
  }
  const term = String(q || '').trim()
  if (term.length >= 2) {
    and.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { placeNameEn: { contains: term, mode: 'insensitive' } },
        { placeNameLocal: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { fullAddress: { contains: term, mode: 'insensitive' } },
      ],
    })
  }

  const where = { AND: and }

  const [rows, total] = await Promise.all([
    prisma.place.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: PUBLIC_SELECT,
    }),
    prisma.place.count({ where }),
  ])

  return {
    places: rows.map(serializePublicPlace),
    total,
    limit: take,
    offset: skip,
  }
}

/** Text search across approved places, ranked by proximity when lat/lng given. */
export async function searchPublicPlaces(q, { limit, lat, lng } = {}) {
  if (!prisma.place) return { results: [], count: 0 }
  const term = String(q || '').trim()
  if (term.length < 2) return { results: [], count: 0 }

  const take = clampLimit(limit, 20)
  const rows = await prisma.place.findMany({
    where: {
      AND: [
        PUBLIC_WHERE,
        {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { placeNameEn: { contains: term, mode: 'insensitive' } },
            { placeNameLocal: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
            { fullAddress: { contains: term, mode: 'insensitive' } },
            { village: { contains: term, mode: 'insensitive' } },
            { district: { contains: term, mode: 'insensitive' } },
          ],
        },
      ],
    },
    take: take * 2,
    orderBy: { createdAt: 'desc' },
    select: PUBLIC_SELECT,
  })

  let results = rows.map(serializePublicPlace)

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    results = results
      .map((p) => ({
        ...p,
        distance_meters: Math.round(haversineMeters(lat, lng, p.latitude, p.longitude)),
      }))
      .sort((a, b) => a.distance_meters - b.distance_meters)
  }

  results = results.slice(0, take)
  return { results, count: results.length }
}

/** Approved places near a point, sorted by distance. */
export async function nearbyPublicPlaces({
  lat,
  lng,
  radiusMeters = 2000,
  category,
  limit,
} = {}) {
  if (!prisma.place) return { results: [], count: 0 }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { results: [], count: 0 }

  const take = clampLimit(limit, 50)
  const radius = Math.min(Math.max(50, radiusMeters), 50000)
  // Bounding-box prefilter (cheap, index-friendly), refined with haversine.
  const delta = radius / 111000 + 0.0005
  const and = [
    PUBLIC_WHERE,
    { latitude: { gte: lat - delta, lte: lat + delta } },
    { longitude: { gte: lng - delta, lte: lng + delta } },
  ]
  if (category) and.push({ category })

  const rows = await prisma.place.findMany({
    where: { AND: and },
    take: 1000,
    orderBy: { createdAt: 'desc' },
    select: PUBLIC_SELECT,
  })

  const results = rows
    .map(serializePublicPlace)
    .map((p) => ({
      ...p,
      distance_meters: Math.round(haversineMeters(lat, lng, p.latitude, p.longitude)),
    }))
    .filter((p) => p.distance_meters <= radius)
    .sort((a, b) => a.distance_meters - b.distance_meters)
    .slice(0, take)

  return { results, count: results.length }
}

/** Distinct approved categories with counts (for legends / filters). */
export async function publicCategories() {
  if (!prisma.place) return { categories: [] }
  const grouped = await prisma.place.groupBy({
    by: ['category'],
    where: PUBLIC_WHERE,
    _count: { category: true },
    orderBy: { category: 'asc' },
  })
  return {
    categories: grouped.map((g) => ({
      category: g.category,
      count: g._count.category,
    })),
  }
}

/** Single approved place by id (returns null when missing or not approved). */
export async function getPublicPlaceById(id) {
  if (!prisma.place || !id) return null
  const place = await prisma.place.findFirst({
    where: { AND: [{ id: String(id) }, PUBLIC_WHERE] },
    select: PUBLIC_SELECT,
  })
  return place ? serializePublicPlace(place) : null
}
