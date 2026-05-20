/** Global duplicate detection for places (all users, extracted + manual). */

export const COORD_EPS = 0.0001

export const DUPLICATE_MESSAGES = {
  google_place_id: 'Place already added',
  coordinates: 'This location already exists in the map',
  name_address: 'Place already added',
  duplicate_in_batch: 'Duplicate in selection',
  invalid: 'Invalid place data',
}

function collapseWs(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizePlaceName(name) {
  return collapseWs(name).replace(/[^\p{L}\p{N}\s]/gu, '')
}

export function normalizeAddress(address) {
  return collapseWs(address).replace(/[^\p{L}\p{N}\s,]/gu, '')
}

export function addressFromParts(parts = {}) {
  return [parts.village, parts.taluk, parts.district, parts.state, parts.country, parts.pincode]
    .filter(Boolean)
    .join(', ')
}

export function addressFromDbRow(row) {
  if (row.fullAddress) return row.fullAddress
  return addressFromParts({
    village: row.village,
    taluk: row.taluk,
    district: row.district,
    state: row.state,
    country: row.country,
    pincode: row.pincode,
  })
}

export function candidateFromPayload(item = {}) {
  const lat = parseFloat(item.lat ?? item.latitude)
  const lng = parseFloat(item.lng ?? item.longitude)
  const name = String(item.name || item.place_name_en || '').trim()
  const address = String(
    item.address ||
      item.full_address ||
      item.fullAddress ||
      addressFromParts(item) ||
      ''
  ).trim()

  return {
    lat,
    lng,
    googlePlaceId:
      String(item.place_id || item.placeId || item.google_place_id || item.googlePlaceId || '').trim() ||
      null,
    name,
    address,
    nameKey: normalizePlaceName(name),
    addressKey: normalizeAddress(address),
  }
}

function coordsMatch(aLat, aLng, bLat, bLng) {
  return (
    Math.abs(aLat - bLat) < COORD_EPS &&
    Math.abs(aLng - bLng) < COORD_EPS
  )
}

function rowKeys(row) {
  const address = addressFromDbRow(row)
  return {
    id: row.id,
    googlePlaceId: row.googlePlaceId || null,
    lat: row.latitude,
    lng: row.longitude,
    nameKey: normalizePlaceName(row.placeNameEn || row.name),
    addressKey: normalizeAddress(address),
  }
}

export function formatDuplicateResult(place, reason) {
  return {
    duplicate: true,
    reason,
    message: DUPLICATE_MESSAGES[reason] || DUPLICATE_MESSAGES.name_address,
    existingPlaceId: place?.id ?? null,
    existingPlaceName: place?.placeNameEn || place?.name || null,
  }
}

/** In-memory index for fast bulk validation (one DB read). */
export class PlaceDuplicateIndex {
  constructor(rows = [], { excludePlaceId = null } = {}) {
    this.byGoogleId = new Map()
    this.coordRows = []
    this.nameAddress = new Map()

    for (const row of rows) {
      if (excludePlaceId && row.id === excludePlaceId) continue
      const keys = rowKeys(row)
      this.coordRows.push({ row, lat: keys.lat, lng: keys.lng })
      if (keys.googlePlaceId) this.byGoogleId.set(keys.googlePlaceId, row)
      if (keys.nameKey && keys.addressKey) {
        this.nameAddress.set(`${keys.nameKey}|${keys.addressKey}`, row)
      }
    }
  }

  static async load(prisma, options = {}) {
    const rows = await prisma.place.findMany({
      select: {
        id: true,
        googlePlaceId: true,
        latitude: true,
        longitude: true,
        placeNameEn: true,
        name: true,
        fullAddress: true,
        village: true,
        taluk: true,
        district: true,
        state: true,
        country: true,
        pincode: true,
      },
    })
    return new PlaceDuplicateIndex(rows, options)
  }

  check(candidate) {
    const c = typeof candidate.nameKey === 'string' ? candidate : candidateFromPayload(candidate)

    if (c.googlePlaceId && this.byGoogleId.has(c.googlePlaceId)) {
      return formatDuplicateResult(this.byGoogleId.get(c.googlePlaceId), 'google_place_id')
    }

    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      const coordHit = this.coordRows.find((r) => coordsMatch(c.lat, c.lng, r.lat, r.lng))
      if (coordHit) return formatDuplicateResult(coordHit.row, 'coordinates')
    }

    if (c.nameKey && c.addressKey) {
      const naHit = this.nameAddress.get(`${c.nameKey}|${c.addressKey}`)
      if (naHit) return formatDuplicateResult(naHit, 'name_address')
    }

    return { duplicate: false }
  }
}

/** Targeted queries for single-place create (avoids loading entire table). */
export async function findPlaceDuplicate(prisma, payload, { excludePlaceId = null } = {}) {
  const c = candidateFromPayload(payload)
  if (!c.name || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) {
    return { duplicate: true, reason: 'invalid', message: DUPLICATE_MESSAGES.invalid }
  }

  const exclude = excludePlaceId ? { id: { not: excludePlaceId } } : {}
  const select = {
    id: true,
    name: true,
    placeNameEn: true,
    googlePlaceId: true,
    latitude: true,
    longitude: true,
    fullAddress: true,
    village: true,
    taluk: true,
    district: true,
    state: true,
    country: true,
    pincode: true,
  }

  if (c.googlePlaceId) {
    const hit = await prisma.place.findFirst({
      where: { googlePlaceId: c.googlePlaceId, ...exclude },
      select,
    })
    if (hit) return formatDuplicateResult(hit, 'google_place_id')
  }

  const coordHit = await prisma.place.findFirst({
    where: {
      ...exclude,
      latitude: { gte: c.lat - COORD_EPS, lte: c.lat + COORD_EPS },
      longitude: { gte: c.lng - COORD_EPS, lte: c.lng + COORD_EPS },
    },
    select,
  })
  if (coordHit) return formatDuplicateResult(coordHit, 'coordinates')

  if (c.nameKey && c.addressKey) {
    const nameCandidates = await prisma.place.findMany({
      where: {
        ...exclude,
        OR: [
          { placeNameEn: { equals: c.name, mode: 'insensitive' } },
          { name: { equals: c.name, mode: 'insensitive' } },
        ],
      },
      select,
      take: 30,
    })
    const hit = nameCandidates.find(
      (row) => normalizeAddress(addressFromDbRow(row)) === c.addressKey
    )
    if (hit) return formatDuplicateResult(hit, 'name_address')
  }

  return { duplicate: false }
}

export function checkAgainstBatch(batchSeen, candidate) {
  const c = candidateFromPayload(candidate)
  const hit = batchSeen.find(
    (b) =>
      (c.googlePlaceId && b.googlePlaceId === c.googlePlaceId) ||
      (Number.isFinite(c.lat) &&
        Number.isFinite(c.lng) &&
        coordsMatch(c.lat, c.lng, b.lat, b.lng)) ||
      (c.nameKey &&
        c.addressKey &&
        b.nameKey === c.nameKey &&
        b.addressKey === c.addressKey)
  )
  if (hit) {
    return {
      duplicate: true,
      reason: 'duplicate_in_batch',
      message: DUPLICATE_MESSAGES.duplicate_in_batch,
    }
  }
  return { duplicate: false }
}

export function rememberInBatch(batchSeen, candidate) {
  batchSeen.push(candidateFromPayload(candidate))
}
