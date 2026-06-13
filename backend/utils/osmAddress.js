import axios from 'axios'
import { axiosWithRetry } from '../services/externalPlaceSearch.js'
import { lookupIndiaVillagePincode } from './indiaVillagePincode.js'

const NOMINATIM_PUBLIC_SEARCH = 'https://nominatim.openstreetmap.org/search'
const SEARCH_URL = (process.env.SEARCH_URL || 'https://umnaapp.in/map/nominatim/search?q=').trim()
const UMNAAPP_NOMINATIM_SEARCH = (process.env.UMNAAPP_NOMINATIM_SEARCH || 'https://umnaapp.in/map/nominatim/search').trim().replace(/\/+$/, '')

function pickFirst(obj, keys) {
  for (const key of keys) {
    const v = obj?.[key]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

function stripAdminSuffix(value) {
  return String(value || '')
    .trim()
    .replace(/\s+(taluk|taluka|tehsil|sub[- ]?district|mandal)$/i, '')
    .trim()
}

function isTalukLike(value) {
  return /\b(taluk|taluka|tehsil|sub[- ]?district|mandal)\b/i.test(String(value || ''))
}

function extractPincodeFromDisplay(displayName) {
  const segments = String(displayName || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const hit = segments.find((s) => /^\d{6}$/.test(s))
  return hit || ''
}

/**
 * Parse Nominatim display_name segments after the village/town name.
 * Typical India pattern: Village, Taluk, District, State [, Pincode] [, Country]
 */
function parseDisplayNameAfterVillage(displayName, village) {
  const segments = String(displayName || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^india$/i.test(s))

  const pincode = segments.find((s) => /^\d{6}$/.test(s)) || ''
  const admin = segments.filter((s) => !/^\d{6}$/.test(s))

  const villageLower = String(village || '').toLowerCase().trim()
  if (!villageLower) return { pincode }

  const idx = admin.findIndex((s) => s.toLowerCase() === villageLower)
  if (idx < 0) return { pincode }

  const after = admin.slice(idx + 1)
  const out = { pincode }
  if (after.length >= 3) {
    out.taluk = stripAdminSuffix(after[0])
    out.district = after[1]
    out.state = after[2]
  } else if (after.length === 2) {
    out.taluk = stripAdminSuffix(after[0])
    out.state = after[1]
  } else if (after.length === 1) {
    if (isTalukLike(after[0])) out.taluk = stripAdminSuffix(after[0])
    else out.state = after[0]
  }
  return out
}

/**
 * Map raw Nominatim/OSM address object to village, taluk, district, state, pincode, country.
 * Handles India where `county` is often taluk and `state_district` is the real district.
 */
export function parseOsmAddressFields(addr, displayName = '') {
  if (!addr || typeof addr !== 'object') {
    return {
      village: '',
      taluk: '',
      district: '',
      state: '',
      pincode: extractPincodeFromDisplay(displayName),
      country: '',
    }
  }

  const village = pickFirst(addr, [
    'village',
    'town',
    'city',
    'hamlet',
    'suburb',
    'locality',
    'neighbourhood',
  ])

  let taluk = pickFirst(addr, ['taluk', 'tehsil', 'subdistrict', 'mandal'])
  let district = pickFirst(addr, ['state_district', 'district'])
  const county = pickFirst(addr, ['county'])
  const municipality = pickFirst(addr, ['municipality'])

  if (county) {
    if (isTalukLike(county)) {
      if (!taluk) taluk = stripAdminSuffix(county)
    } else if (!taluk && district && county.toLowerCase() !== district.toLowerCase()) {
      taluk = stripAdminSuffix(county)
    } else if (!taluk && !district) {
      taluk = stripAdminSuffix(county)
    } else if (!taluk) {
      taluk = stripAdminSuffix(county)
    }
  }

  if (!taluk && municipality) {
    taluk = stripAdminSuffix(municipality)
  }

  if (district && taluk && district.toLowerCase() === taluk.toLowerCase()) {
    district = pickFirst(addr, ['state_district', 'district'])
  }

  if (district && isTalukLike(district) && !taluk) {
    taluk = stripAdminSuffix(district)
    district = pickFirst(addr, ['state_district']) || ''
  }

  let state = pickFirst(addr, ['state', 'region'])
  const country = pickFirst(addr, ['country'])

  const fromDisplay = parseDisplayNameAfterVillage(displayName, village)
  if (!taluk && fromDisplay.taluk) taluk = fromDisplay.taluk
  if (!district && fromDisplay.district) district = fromDisplay.district
  if (!state && fromDisplay.state) state = fromDisplay.state

  // Pincode from GPS/display is often wrong for rural villages — resolved separately.
  const coordinatePincode =
    fromDisplay.pincode ||
    pickFirst(addr, ['postcode', 'postal_code']) ||
    extractPincodeFromDisplay(displayName)
  const pincode = village ? '' : coordinatePincode

  return { village, taluk, district, state, pincode, country, coordinatePincode }
}

async function nominatimSearch(query, { limit = 5 } = {}) {
  const q = String(query || '').trim()
  if (!q) return []

  const bases = [
    UMNAAPP_NOMINATIM_SEARCH,
    SEARCH_URL.replace(/\?q=$/, '').replace(/\/+$/, ''),
    NOMINATIM_PUBLIC_SEARCH,
  ].filter(Boolean)

  for (const base of bases) {
    try {
      const res = await axiosWithRetry(
        () =>
          axios.get(base, {
            params: { q, format: 'json', limit, addressdetails: 1 },
            headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
            timeout: 8000,
          }),
        { maxRetries: 1 }
      )
      const data = res.data
      const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      if (rows.length) return rows
    } catch {
      continue
    }
  }
  return []
}

export async function lookupPincodeForVillage(fields) {
  const village = String(fields?.village || '').trim()
  if (!village) return fields?.coordinatePincode || fields?.pincode || ''

  const fromDirectory = await lookupIndiaVillagePincode(fields)
  if (fromDirectory) return fromDirectory

  return fields?.coordinatePincode || fields?.pincode || ''
}

export async function buildNormalizedAddressFields(addr, displayName = '') {
  const fields = parseOsmAddressFields(addr, displayName)
  if (fields.village) {
    fields.pincode = await lookupPincodeForVillage(fields)
  } else if (!fields.pincode) {
    fields.pincode = fields.coordinatePincode || ''
  }
  delete fields.coordinatePincode
  return fields
}
