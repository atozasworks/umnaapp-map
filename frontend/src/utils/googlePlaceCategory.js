/** App place categories (matches backend / map filters). */
export const PLACE_CATEGORIES = [
  'Restaurant',
  'Hospital',
  'Hotel',
  'Parking',
  'Shop',
  'Grocery Store',
  'School',
  'Temple',
  'Bank',
  'Post Office',
  'Bus Stop',
  'Police Station',
  'Petrol Pump',
  'Tourist Place',
  'Transit',
  'Museum',
  'Pharmacy',
  'ATM',
  'Cinema',
  'Gym',
  'Salon',
  'Festival',
  'Other',
]

/** Google Places types → app category labels. */
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

/** Match places whose name contains these when Google types are generic. */
export const CATEGORY_NAME_KEYWORDS = {
  Hotel: ['hotel', 'lodge', 'resort', 'inn', 'guest', 'homestay', 'lodging', 'stay'],
  Restaurant: ['restaurant', 'dhaba', 'eatery', 'biryani', 'cafe'],
  ATM: ['atm', 'cash point'],
  Pharmacy: ['pharmacy', 'chemist', 'medical store', 'medicals'],
  Hospital: ['hospital', 'clinic', 'health centre', 'health center'],
  Temple: ['temple', 'masjid', 'mosque', 'church', 'juma', 'dargah'],
  Bank: ['bank'],
  'Petrol Pump': ['petrol', 'fuel', 'gas station', 'filling'],
  'Bus Stop': ['bus stop', 'bus stand'],
  'Grocery Store': ['general stores', 'general store', 'grocery store', 'grocery', 'supermarket', 'provision store', 'provisions store', 'kirana', 'provisions', 'departmental store'],
  Shop: ['shop', 'mart'],
}

const STRONG_NAME_KEYWORD_MIN_LEN = 10

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

export function pickPrimaryGoogleType(types, fallback = null) {
  const list = uniqueTypes(types, fallback)
  for (const t of list) {
    if (!GENERIC_GOOGLE_TYPES.has(t)) return t
  }
  return list[0] || (fallback ? String(fallback).toLowerCase().trim() : null)
}

/** Build extract draft fields (category + primary type) from a Google nearby/search result. */
export function categoryFieldsFromGooglePlace(googlePlace, searchType = null) {
  const types = googlePlace?.types || []
  const name = googlePlace?.name || null
  const category = resolvePlaceCategory({ types, name, searchType })
  const type = pickPrimaryGoogleType(types, searchType)
  return { category, type, types }
}

/** Best category for display/save — re-resolves when DB has generic "Other". */
export function displayCategoryForPlace(place) {
  if (!place) return 'Other'
  return resolvePlaceCategory({
    category: place.category,
    type: place.type ?? place.google_type ?? place.googleType,
    types: place.types ?? place.google_types ?? place.googleTypes,
    googleTypes: place.google_types ?? place.googleTypes,
    googleType: place.google_type ?? place.googleType,
    name: place.name ?? place.place_name_en ?? place.placeNameEn,
  })
}
