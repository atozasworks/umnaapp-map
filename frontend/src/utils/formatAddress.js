/**
 * Format address for display in place search suggestions.
 * Returns "Taluk, District, State" using available OSM/Nominatim address keys.
 * Handles India-specific (taluk, tehsil, subdistrict) and common keys.
 */
export function formatAddressSubtitle(address) {
  if (!address || typeof address !== 'object') return ''

  const taluk = address.taluk || address.tehsil || address.subdistrict || address.municipality
  const district = address.county || address.state_district || address.district
  const state = address.state

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
