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
 * Map raw Nominatim/OSM address to village, taluk, district, state, pincode, country.
 * In India, `county` is often taluk; `state_district` is the district.
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

  const coordinatePincode =
    fromDisplay.pincode ||
    pickFirst(addr, ['postcode', 'postal_code']) ||
    extractPincodeFromDisplay(displayName)
  const pincode = village ? '' : coordinatePincode

  return { village, taluk, district, state, pincode, country }
}

/**
 * Format address for display in place search suggestions.
 * Returns "Taluk, District, State" using available OSM/Nominatim address keys.
 */
export function formatAddressSubtitle(address) {
  if (!address || typeof address !== 'object') return ''
  const { taluk, district, state } = parseOsmAddressFields(address)
  const parts = [taluk, district, state].filter(Boolean)
  return parts.join(', ')
}

/**
 * Build Google-Maps-style search-suggestion text: a bold main name (title)
 * plus a lighter area subtitle (taluk / district / state).
 *
 * Works for both Nominatim results (full comma-separated `displayName`
 * + structured `address`) and simple `{ name }` results:
 *   - title    = the first comma segment of the display name (the place itself)
 *   - subtitle = structured taluk/district/state, else the remaining
 *                display-name segments (pincode + country stripped)
 */
export function formatSearchSuggestion(result) {
  const display = String(result?.displayName ?? '').trim()
  const segments = display
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const title = segments[0] || display || 'Unknown place'

  let subtitle = formatAddressSubtitle(result?.address)

  if (!subtitle && segments.length > 1) {
    subtitle = segments
      .slice(1)
      .filter((s) => !/^\d[\d\s-]*$/.test(s)) // drop pincode (all-digits)
      .filter((s) => !/^india$/i.test(s)) // drop country
      .join(', ')
  }

  return { title, subtitle }
}

/**
 * Extract just the place-specific name from a Nominatim-style display name.
 *
 * Reverse-geocode `display_name` is a comma-separated full address such as:
 *   "Navyasuresh house, Aithoor, Kadaba, Dakshina Kannada, Karnataka, 574221, India"
 * The very first segment is the specific feature (POI / building / road), and the
 * remaining segments are administrative/area context that we already store in
 * separate address fields (village, taluk, district, state, pincode, country).
 *
 * Saving the full string as the place name is wrong — only the specific name
 * should be saved. This helper returns just that specific name, or an empty
 * string when the first segment is itself a generic area (e.g. clicking on an
 * empty field that resolves to "Aithoor, Kadaba, ...").
 */
export function extractPlaceNameFromDisplay(displayName, address) {
  const raw = String(displayName ?? '').trim()
  if (!raw) return ''

  const firstSegment = raw.split(',')[0]?.trim() || ''
  if (!firstSegment) return ''

  const genericValues = [
    address?.village,
    address?.town,
    address?.city,
    address?.hamlet,
    address?.suburb,
    address?.neighbourhood,
    address?.locality,
    address?.county,
    address?.state_district,
    address?.district,
    address?.taluk,
    address?.tehsil,
    address?.subdistrict,
    address?.municipality,
    address?.state,
    address?.region,
    address?.country,
    address?.postcode,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim())

  const firstLower = firstSegment.toLowerCase()
  if (genericValues.includes(firstLower)) return ''

  return firstSegment
}

/**
 * Sanitize a user/AI-supplied place name so that we never persist the full
 * comma-separated address as the place name. Drops trailing administrative
 * segments that already exist as structured fields.
 *
 * Examples:
 *   "Navyasuresh house, Aithoor, Kadaba, Karnataka, 574221, India"
 *     -> "Navyasuresh house"
 *   "Kadaba Bus Stand"
 *     -> "Kadaba Bus Stand"
 */
export function sanitizePlaceName(name, address) {
  const raw = String(name ?? '').trim()
  if (!raw) return ''
  if (!raw.includes(',')) return raw

  const segments = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return ''

  const head = segments[0]
  if (!address || typeof address !== 'object') return head

  const genericValues = new Set(
    [
      address.village,
      address.town,
      address.city,
      address.hamlet,
      address.suburb,
      address.neighbourhood,
      address.locality,
      address.county,
      address.state_district,
      address.district,
      address.taluk,
      address.tehsil,
      address.subdistrict,
      address.municipality,
      address.state,
      address.region,
      address.country,
      address.postcode,
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().trim())
  )

  const headLower = head.toLowerCase()
  if (genericValues.has(headLower)) return ''
  return head
}
