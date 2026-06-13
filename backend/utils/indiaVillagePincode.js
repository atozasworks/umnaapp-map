import axios from 'axios'
import { axiosWithRetry } from '../services/externalPlaceSearch.js'

const VILLAGEINFO_BASE = 'https://villageinfo.in'
const POSTAL_API = 'https://api.postalpincode.in/postoffice'

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractPincodeFromHtml(html) {
  if (!html || typeof html !== 'string') return ''
  const patterns = [
    /pincode[:\s/"']*(\d{6})/i,
    /Pincode[^0-9]{0,60}(\d{6})/i,
    /"pincode"\s*:\s*"(\d{6})"/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1] && /^\d{6}$/.test(match[1])) return match[1]
  }
  return ''
}

function buildVillageInfoUrls(fields) {
  const state = toSlug(fields.state)
  const district = toSlug(fields.district)
  const village = toSlug(fields.village)
  const taluk = toSlug(fields.taluk)
  if (!state || !district || !village) return []

  const urls = new Set()
  if (taluk) urls.add(`${VILLAGEINFO_BASE}/${state}/${district}/${taluk}/${village}/`)
  urls.add(`${VILLAGEINFO_BASE}/${state}/${district}/${village}/`)
  urls.add(`${VILLAGEINFO_BASE}/${state}/${district}/${village}.html`)
  return [...urls]
}

async function fetchVillageInfoPincode(fields) {
  for (const url of buildVillageInfoUrls(fields)) {
    try {
      const res = await axiosWithRetry(
        () =>
          axios.get(url, {
            timeout: 9000,
            headers: { 'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)' },
            validateStatus: (s) => s === 200,
          }),
        { maxRetries: 1 }
      )
      const pincode = extractPincodeFromHtml(res.data)
      if (pincode) return pincode
    } catch {
      continue
    }
  }
  return ''
}

function matchesAdminContext(office, fields) {
  const state = String(fields.state || '').toLowerCase().trim()
  const district = String(fields.district || '').toLowerCase().trim()
  const taluk = String(fields.taluk || '').toLowerCase().trim()
  const officeState = String(office.State || '').toLowerCase().trim()
  const officeDistrict = String(office.District || '').toLowerCase().trim()
  const officeTaluk = String(office.Block || office.Division || '').toLowerCase().trim()

  if (state && officeState && !officeState.includes(state) && !state.includes(officeState)) {
    return false
  }
  if (district && officeDistrict && !officeDistrict.includes(district) && !district.includes(officeDistrict)) {
    return false
  }
  if (taluk && officeTaluk && !officeTaluk.includes(taluk) && !taluk.includes(officeTaluk)) {
    return false
  }
  return true
}

async function fetchPostalDirectoryPincode(fields) {
  const village = String(fields.village || '').trim()
  if (!village) return ''

  const queries = [
    [village, fields.taluk, fields.district, fields.state].filter(Boolean).join(', '),
    village,
  ]

  for (const q of queries) {
    try {
      const res = await axios.get(`${POSTAL_API}/${encodeURIComponent(q)}`, { timeout: 8000 })
      const offices = res.data?.[0]?.PostOffice
      if (!Array.isArray(offices)) continue

      const exact = offices.find(
        (o) => String(o.Name || '').toLowerCase().trim() === village.toLowerCase() && matchesAdminContext(o, fields)
      )
      if (exact?.Pincode && /^\d{6}$/.test(String(exact.Pincode))) return String(exact.Pincode)

      const partial = offices.find(
        (o) => String(o.Name || '').toLowerCase().includes(village.toLowerCase()) && matchesAdminContext(o, fields)
      )
      if (partial?.Pincode && /^\d{6}$/.test(String(partial.Pincode))) return String(partial.Pincode)
    } catch {
      continue
    }
  }
  return ''
}

/**
 * Resolve official village pincode using India village directory + postal directory.
 * Coordinate reverse-geocode pincodes are often wrong for rural GPS points.
 */
export async function lookupIndiaVillagePincode(fields) {
  const village = String(fields?.village || '').trim()
  if (!village) return ''

  const fromVillageInfo = await fetchVillageInfoPincode(fields)
  if (fromVillageInfo) return fromVillageInfo

  const fromPostal = await fetchPostalDirectoryPincode(fields)
  if (fromPostal) return fromPostal

  return ''
}
