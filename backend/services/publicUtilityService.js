/**
 * Public Utility Finder — merge OSM amenity hits with matching local DB places.
 */

import prisma from '../config/database.js'
import { placePublicVisibilityOr } from './placeApproval.js'
import {
  getUtilityType,
  UTILITY_DEFAULT_RADIUS_METERS,
  UTILITY_NEARBY_LIMIT,
  UTILITY_RADIUS_METERS,
} from '../config/publicUtilities.js'
import { findOsmUtilitiesNearby, isOsmQueryEnabled } from './osmPlaceQuery.js'
import { unifiedTextSearch } from './unifiedPlaceQuery.js'
import { COORD_EPS } from '../utils/placeDuplicate.js'
import { PLACE_SOURCES } from '../utils/placeSource.js'

function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function normalizeRadius(radiusMeters) {
  const n = Number(radiusMeters)
  if (!Number.isFinite(n)) return UTILITY_DEFAULT_RADIUS_METERS
  const allowed = UTILITY_RADIUS_METERS
  let best = allowed[0]
  let bestDiff = Math.abs(n - best)
  for (const r of allowed) {
    const d = Math.abs(n - r)
    if (d < bestDiff) {
      best = r
      bestDiff = d
    }
  }
  return best
}

function coordKey(lat, lng) {
  return `${Number(lat).toFixed(5)}-${Number(lng).toFixed(5)}`
}

async function findDbUtilitiesNearby({
  lat,
  lng,
  radiusMeters,
  dbCategories,
  categoryLabel,
  viewerId,
  limit,
}) {
  if (!dbCategories?.length || !prisma.place) return []

  const delta = radiusMeters / 111000 + COORD_EPS
  const rows = await prisma.place.findMany({
    where: {
      AND: [
        placePublicVisibilityOr(viewerId),
        { category: { in: dbCategories } },
        {
          latitude: { gte: lat - delta, lte: lat + delta },
          longitude: { gte: lng - delta, lte: lng + delta },
        },
      ],
    },
    take: Math.min(limit * 2, 120),
    select: {
      id: true,
      name: true,
      placeNameEn: true,
      category: true,
      latitude: true,
      longitude: true,
      fullAddress: true,
      vicinity: true,
      village: true,
      taluk: true,
      district: true,
      state: true,
      userId: true,
      userName: true,
    },
  })

  return rows
    .map((p) => {
      const distanceMeters = Math.round(
        haversineMeters(lat, lng, p.latitude, p.longitude)
      )
      if (distanceMeters > radiusMeters) return null
      const name = p.placeNameEn || p.name || categoryLabel
      const addressParts = [
        p.vicinity,
        p.village,
        p.taluk,
        p.district,
        p.state,
      ].filter(Boolean)
      return {
        id: p.id,
        placeId: p.id,
        name,
        placeNameEn: name,
        place_name_en: name,
        category: categoryLabel,
        latitude: p.latitude,
        longitude: p.longitude,
        source: PLACE_SOURCES.CONTRIBUTION,
        isPersisted: true,
        isDbPlace: true,
        distanceMeters,
        address: p.fullAddress || addressParts.join(', ') || null,
        userId: p.userId,
        userName: p.userName,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit)
}

async function searchFallbackUtilities({
  lat,
  lng,
  radiusMeters,
  searchQueries,
  categoryLabel,
  defaultName,
  viewerId,
  limit,
  existingKeys,
}) {
  if (!searchQueries?.length) return []
  const radiusKm = radiusMeters / 1000
  const out = []

  for (const q of searchQueries) {
    if (out.length >= limit) break
    try {
      const { results } = await unifiedTextSearch(q, {
        viewerId,
        limit: 12,
        lat,
        lng,
        radiusKm,
      })
      for (const r of results || []) {
        const rLat = Number(r.latitude ?? r.lat)
        const rLng = Number(r.longitude ?? r.lng ?? r.lon)
        if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) continue
        const distanceMeters = Math.round(haversineMeters(lat, lng, rLat, rLng))
        if (distanceMeters > radiusMeters) continue
        const key = coordKey(rLat, rLng)
        if (existingKeys.has(key)) continue
        existingKeys.add(key)
        const name = String(r.name || r.displayName || r.place_name_en || '').trim() || defaultName
        const id = r.id || r.placeId || `search-${key}`
        out.push({
          id,
          placeId: id,
          name,
          placeNameEn: name,
          place_name_en: name,
          category: categoryLabel,
          latitude: rLat,
          longitude: rLng,
          source: r.source || 'search',
          isPersisted: Boolean(r.isPersisted || r.isDbPlace),
          isDbPlace: Boolean(r.isDbPlace),
          distanceMeters,
          address:
            typeof r.address === 'string'
              ? r.address
              : r.fullAddress || r.full_address || null,
        })
        if (out.length >= limit) break
      }
    } catch (e) {
      console.warn('[utilities] search fallback failed:', e.message)
    }
  }

  return out
}

/**
 * Find nearby public utilities for a type id (toilets, atm, …).
 */
export async function findPublicUtilitiesNearby({
  lat,
  lng,
  type,
  radiusMeters = UTILITY_DEFAULT_RADIUS_METERS,
  viewerId = null,
  limit = UTILITY_NEARBY_LIMIT,
} = {}) {
  const utility = getUtilityType(type)
  if (!utility) {
    const err = new Error('Invalid utility type')
    err.status = 400
    throw err
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const err = new Error('Valid lat and lng required')
    err.status = 400
    throw err
  }

  const radius = normalizeRadius(radiusMeters)
  const cap = Math.min(Math.max(1, limit), UTILITY_NEARBY_LIMIT)

  const [osmPlaces, dbPlaces] = await Promise.all([
    isOsmQueryEnabled()
      ? findOsmUtilitiesNearby({
          lat,
          lng,
          radiusMeters: radius,
          osmFilters: utility.osmFilters,
          defaultName: utility.defaultName,
          categoryLabel: utility.label,
          limit: cap,
        })
      : Promise.resolve([]),
    findDbUtilitiesNearby({
      lat,
      lng,
      radiusMeters: radius,
      dbCategories: utility.dbCategories,
      categoryLabel: utility.label,
      viewerId,
      limit: cap,
    }),
  ])

  const byKey = new Map()
  const add = (p) => {
    if (!p) return
    const key = p.isDbPlace ? `db:${p.id}` : coordKey(p.latitude, p.longitude)
    const prev = byKey.get(key)
    if (!prev || (p.distanceMeters ?? Infinity) < (prev.distanceMeters ?? Infinity)) {
      byKey.set(key, p)
    }
  }

  dbPlaces.forEach(add)
  osmPlaces.forEach(add)

  let merged = [...byKey.values()].sort(
    (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)
  )

  if (merged.length < 3) {
    const existingKeys = new Set(merged.map((p) => coordKey(p.latitude, p.longitude)))
    const fallback = await searchFallbackUtilities({
      lat,
      lng,
      radiusMeters: radius,
      searchQueries: utility.searchQueries,
      categoryLabel: utility.label,
      defaultName: utility.defaultName,
      viewerId,
      limit: Math.max(0, cap - merged.length),
      existingKeys,
    })
    for (const p of fallback) add(p)
    merged = [...byKey.values()].sort(
      (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)
    )
  }

  return {
    type: utility.id,
    label: utility.label,
    radiusMeters: radius,
    count: Math.min(merged.length, cap),
    results: merged.slice(0, cap).map((p) => ({
      id: p.id,
      placeId: p.placeId || p.id,
      name: p.name,
      place_name_en: p.place_name_en || p.name,
      category: p.category || utility.label,
      latitude: p.latitude,
      longitude: p.longitude,
      distanceMeters: p.distanceMeters ?? null,
      address: p.address || null,
      source: p.source || null,
      isPersisted: Boolean(p.isPersisted || p.isDbPlace),
    })),
  }
}
