import { CATEGORY_NAME_KEYWORDS, PLACE_CATEGORIES } from '../services/askMapsConstants.js'

/** Google Places types → app category labels (map filters / DB). */
export const GOOGLE_PLACE_TYPE_TO_CATEGORY = {
  restaurant: 'Restaurant',
  meal_takeaway: 'Restaurant',
  meal_delivery: 'Restaurant',
  cafe: 'Restaurant',
  bar: 'Restaurant',
  bakery: 'Restaurant',
  food: 'Restaurant',
  night_club: 'Restaurant',
  hospital: 'Hospital',
  doctor: 'Hospital',
  dentist: 'Hospital',
  physiotherapist: 'Hospital',
  veterinary_care: 'Hospital',
  health: 'Hospital',
  lodging: 'Hotel',
  parking: 'Parking',
  convenience_store: 'Grocery Store',
  supermarket: 'Grocery Store',
  grocery_or_supermarket: 'Grocery Store',
  general_store: 'Grocery Store',
  store: 'Shop',
  shopping_mall: 'Shop',
  clothing_store: 'Shop',
  electronics_store: 'Shop',
  furniture_store: 'Shop',
  hardware_store: 'Shop',
  home_goods_store: 'Shop',
  jewelry_store: 'Shop',
  shoe_store: 'Shop',
  book_store: 'Shop',
  florist: 'Shop',
  department_store: 'Shop',
  home_improvement_store: 'Shop',
  school: 'School',
  secondary_school: 'School',
  primary_school: 'School',
  university: 'School',
  hindu_temple: 'Temple',
  church: 'Temple',
  mosque: 'Temple',
  synagogue: 'Temple',
  place_of_worship: 'Temple',
  bank: 'Bank',
  atm: 'ATM',
  finance: 'Bank',
  post_office: 'Post Office',
  bus_station: 'Bus Stop',
  bus_stop: 'Bus Stop',
  subway_station: 'Transit',
  train_station: 'Transit',
  transit_station: 'Transit',
  light_rail_station: 'Transit',
  police: 'Police Station',
  gas_station: 'Petrol Pump',
  tourist_attraction: 'Tourist Place',
  museum: 'Museum',
  art_gallery: 'Museum',
  pharmacy: 'Pharmacy',
  drugstore: 'Pharmacy',
  movie_theater: 'Cinema',
  gym: 'Gym',
  beauty_salon: 'Salon',
  hair_care: 'Salon',
  spa: 'Salon',
}

const GENERIC_GOOGLE_TYPES = new Set([
  'establishment',
  'point_of_interest',
  'geocode',
  'premise',
  'subpremise',
  'locality',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'neighborhood',
  'political',
  'plus_code',
  'route',
  'street_address',
  'floor',
  'room',
  'general_contractor',
])

export function mapGoogleTypeToCategory(rawType) {
  const type = String(rawType || '')
    .toLowerCase()
    .trim()
  if (GOOGLE_PLACE_TYPE_TO_CATEGORY[type]) return GOOGLE_PLACE_TYPE_TO_CATEGORY[type]
  if (PLACE_CATEGORIES.includes(String(rawType || '').trim())) return String(rawType).trim()
  return 'Other'
}

function categoryFromPlaceName(name) {
  const n = String(name || '').toLowerCase()
  if (!n) return null
  let best = null
  let bestLen = 0
  for (const [cat, keywords] of Object.entries(CATEGORY_NAME_KEYWORDS)) {
    for (const kw of keywords) {
      if (n.includes(kw) && kw.length > bestLen) {
        best = cat
        bestLen = kw.length
      }
    }
  }
  return best ? { category: best, keywordLen: bestLen } : null
}

/** Name keywords this long (e.g. "general stores") beat wrong Google types like restaurant. */
const STRONG_NAME_KEYWORD_MIN_LEN = 10

function uniqueTypes(...sources) {
  const seen = new Set()
  const out = []
  for (const src of sources) {
    const list = Array.isArray(src) ? src : src != null ? [src] : []
    for (const raw of list) {
      const t = String(raw || '')
        .toLowerCase()
        .trim()
      if (!t || seen.has(t)) continue
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

/** Pick best app category from Google types, optional name, and search hint. */
export function resolvePlaceCategory({
  category = null,
  type = null,
  types = null,
  googleTypes = null,
  googleType = null,
  name = null,
  searchType = null,
} = {}) {
  const cat = String(category || '').trim()
  const nameMatch = categoryFromPlaceName(name)

  if (nameMatch && nameMatch.keywordLen >= STRONG_NAME_KEYWORD_MIN_LEN) {
    return nameMatch.category
  }

  if (cat && cat !== 'Other' && PLACE_CATEGORIES.includes(cat)) return cat

  const typeList = uniqueTypes(types, googleTypes, type, googleType, searchType)

  for (const t of typeList) {
    if (GENERIC_GOOGLE_TYPES.has(t)) continue
    const mapped = GOOGLE_PLACE_TYPE_TO_CATEGORY[t]
    if (mapped && mapped !== 'Other') return mapped
  }

  if (nameMatch) return nameMatch.category

  for (const t of typeList) {
    const mapped = GOOGLE_PLACE_TYPE_TO_CATEGORY[t]
    if (mapped) return mapped
  }

  return 'Other'
}

/** Store the most specific Google type (skip generic POI labels when possible). */
export function pickPrimaryGoogleType(types, fallback = null) {
  const list = uniqueTypes(types, fallback)
  for (const t of list) {
    if (!GENERIC_GOOGLE_TYPES.has(t)) return t
  }
  return list[0] || (fallback ? String(fallback).toLowerCase().trim() : null)
}
