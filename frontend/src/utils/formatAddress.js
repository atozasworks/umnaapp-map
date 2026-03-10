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
