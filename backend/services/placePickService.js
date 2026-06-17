/**
 * Resolve a map click to a place when planet_osm_* DB is unavailable or has no match.
 * Uses reverse geocoding (umnaapp / Nominatim) — same sources as tile label data.
 */

import axios from 'axios'
import { axiosWithRetry } from './externalPlaceSearch.js'
import { parseOsmAddressFields } from '../utils/osmAddress.js'
import { makeOsmPlaceId, parseOsmPlaceId, PLACE_SOURCES } from '../utils/placeSource.js'

const REVERSE_URL = process.env.REVERSE_URL || 'https://umnaapp.in/map/reverse'
const NOMINATIM_URL = (process.env.NOMINATIM_URL || '').trim().replace(/\/+$/, '')
const NOMINATIM_PUBLIC = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_LOOKUP_PUBLIC = 'https://nominatim.openstreetmap.org/lookup'

async function reverseGeocodeAtPoint(lat, lon) {
  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null

  const urls = [
    (REVERSE_URL || '').trim().replace(/\/+$/, '') || 'https://umnaapp.in/map/reverse',
    NOMINATIM_URL ? `${NOMINATIM_URL}/reverse` : null,
    NOMINATIM_PUBLIC,
  ].filter(Boolean)

  for (const base of urls) {
    for (const params of [
      { lat: latNum, lon: lonNum, format: 'json', addressdetails: 1, zoom: 18 },
      { lat: latNum, lng: lonNum, format: 'json', addressdetails: 1, zoom: 18 },
    ]) {
      try {
        const res = await axiosWithRetry(
          () =>
            axios.get(base, {
              params,
              headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
              timeout: 8000,
            }),
          { maxRetries: 1 }
        )
        const result = res.data
        if (result && !result.error && (result.address || result.display_name || result.name)) {
          return result
        }
      } catch {
        continue
      }
    }
  }
  return null
}

function nameFromReverseResult(result) {
  if (!result) return null
  if (result.name && String(result.name).trim()) return String(result.name).trim()
  const addr = result.address || {}
  for (const key of [
    'village',
    'hamlet',
    'town',
    'city',
    'suburb',
    'neighbourhood',
    'locality',
    'county',
  ]) {
    const v = addr[key]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  const first = String(result.display_name || '')
    .split(',')[0]
    ?.trim()
  return first || null
}

function categoryFromReverseResult(result) {
  const addr = result?.address || {}
  if (addr.hamlet) return 'Hamlet'
  if (addr.village) return 'Village'
  if (addr.town) return 'Town'
  if (addr.city) return 'City'
  if (addr.suburb || addr.neighbourhood) return 'Suburb'
  const t = String(result?.type || result?.category || result?.class || '').toLowerCase()
  if (t.includes('hamlet')) return 'Hamlet'
  if (t.includes('village')) return 'Village'
  if (t.includes('town')) return 'Town'
  if (t.includes('city')) return 'City'
  return 'Other'
}

/** Map Nominatim reverse/lookup JSON to unified place shape. */
export function placeFromNominatimResult(result, fallbackLat = null, fallbackLng = null) {
  if (!result) return null
  const name = nameFromReverseResult(result)
  if (!name) return null

  const addr = parseOsmAddressFields(result.address, result.display_name)
  const latOut = Number.isFinite(parseFloat(result.lat)) ? parseFloat(result.lat) : fallbackLat
  const lngOut = Number.isFinite(parseFloat(result.lon ?? result.lng))
    ? parseFloat(result.lon ?? result.lng)
    : fallbackLng
  if (!Number.isFinite(latOut) || !Number.isFinite(lngOut)) return null

  const osmType =
    result.osm_type === 'way' || result.osm_type === 'relation'
      ? result.osm_type
      : 'node'
  const id =
    result.osm_id != null
      ? makeOsmPlaceId(osmType, result.osm_id)
      : `ext-coord-${latOut.toFixed(5)}-${lngOut.toFixed(5)}`

  return {
    id,
    placeId: id,
    name,
    placeNameEn: name,
    place_name_en: name,
    category: categoryFromReverseResult(result),
    latitude: latOut,
    longitude: lngOut,
    zoomLevel: 16,
    source: result.osm_id != null ? PLACE_SOURCES.OSM : PLACE_SOURCES.EXTERNAL,
    osmId: result.osm_id ?? null,
    osmType: result.osm_type ?? null,
    fullAddress: result.display_name || null,
    full_address: result.display_name || null,
    village: addr.village || null,
    taluk: addr.taluk || null,
    district: addr.district || null,
    state: addr.state || null,
    country: addr.country || null,
    pincode: addr.pincode || null,
    vicinity: addr.village || addr.taluk || null,
    isPersisted: false,
    isDbPlace: false,
  }
}

/** Lookup a place by unified OSM id via Nominatim (when planet_osm_* DB has no row). */
export async function lookupOsmPlaceById(id) {
  const parsed = parseOsmPlaceId(id)
  if (!parsed) return null

  const prefix =
    parsed.osmType === 'way' ? 'W' : parsed.osmType === 'relation' ? 'R' : 'N'
  const osmIds = `${prefix}${parsed.osmId}`

  const bases = [
    NOMINATIM_URL ? `${NOMINATIM_URL}/lookup` : null,
    NOMINATIM_LOOKUP_PUBLIC,
  ].filter(Boolean)

  for (const base of bases) {
    try {
      const res = await axiosWithRetry(
        () =>
          axios.get(base, {
            params: { osm_ids: osmIds, format: 'json', addressdetails: 1 },
            headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
            timeout: 8000,
          }),
        { maxRetries: 1 }
      )
      const rows = Array.isArray(res.data) ? res.data : []
      if (rows.length) return placeFromNominatimResult(rows[0])
    } catch {
      continue
    }
  }
  return null
}

/** Build a unified place record from reverse-geocode JSON. */
export async function pickFromReverseGeocode(lat, lng) {
  const result = await reverseGeocodeAtPoint(lat, lng)
  return placeFromNominatimResult(result, lat, lng)
}
